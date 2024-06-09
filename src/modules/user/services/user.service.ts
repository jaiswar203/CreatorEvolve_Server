import { Model, ObjectId } from 'mongoose';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@/schemas/users/user.schema';
import { UserDto } from '../dto/user.request.dto';
import * as bcrypt from 'bcrypt';
import { auth } from 'googleapis/build/src/apis/oauth2';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(userData: UserDto) {
    const { email, password } = userData;

    const isUserAlreadyExist = await this.userModel.findOne({ email });
    if (isUserAlreadyExist)
      throw new HttpException(
        'User already exist with this email',
        HttpStatus.BAD_REQUEST,
      );

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      ...userData,
      password: hashedPassword,
    });
    return user.save();
  }

  async getUserById(id: string) {
    const user = await this.userModel.findById(id).lean();

    if (!user) return null;

    return user;
  }

  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          google_access_token: accessToken,
          google_refresh_token: refreshToken,
        },
      )
      .exec();
  }

  async refreshAccessToken(userId: string): Promise<string> {
    const user = await this.getUserById(userId);
    const oauth2Client = new auth.OAuth2();
    oauth2Client.setCredentials({
      refresh_token: user.google_refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    await this.saveTokens(
      userId,
      credentials.access_token,
      credentials.refresh_token,
    );
    return credentials.access_token;
  }

  async saveVideo(userId: string, videoId: string) {
    await this.userModel.findByIdAndUpdate(
      userId,
      {
        $push: { videos: videoId },
      },
      { new: true },
    );

    return {
      success: true,
    };
  }

  async getUserByGoogleId(googleId: string) {
    const user = await this.userModel.findOne({ google_id: googleId });

    if (!user) return null;

    return user;
  }

  async getVideosList(userId: string) {
    try {
      const user = await this.userModel
        .findById(userId)
        .populate({
          path: 'videos',
          options: {
            sort: { _id: -1 },
          },
        })
        .lean();

      if (!user)
        throw new HttpException(
          'User not exist with this _Id',
          HttpStatus.NOT_FOUND,
        );

      return user.videos;
    } catch (error) {
      console.log({ error });
    }
  }

  async verifyUserAccessCode(userId: ObjectId, accessCode: number) {
    const user = await this.userModel
      .findById(userId)
      .select('access_code')
      .lean();

    if (user.access_code === accessCode) return true;

    return false;
  }
}
