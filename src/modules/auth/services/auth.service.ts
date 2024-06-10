import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { LoginDTO } from '../dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@/db/schemas/users/user.schema';
import { Model } from 'mongoose';
import { compare, hash } from 'bcrypt';
import { SignUpDto } from '../dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@/common/mail/services/mail.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MINUTES } from '@/common/constants/time';
import { responseGenerator } from '@/common/config/helper/response.helper';
import { LoggerService } from '@/common/logger/services/logger.service';
import { GoogleResponseDTO } from '../dto/google-response.dto';
import { YoutubeResponseDTO } from '../dto/youtube-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private mailService: MailService,
    private readonly loggerService: LoggerService,
  ) {}

  async loginUser(body: LoginDTO) {
    const { email, password } = body;

    this.loggerService.log(
      JSON.stringify({
        message: 'loginUser: Retrieving user from database - Start',
        data: { email },
      }),
    );

    const user = await this.userModel.findOne({ email });
    if (!user) {
      this.loggerService.error(
        JSON.stringify({
          message: 'loginUser: User not found',
          data: { email },
        }),
      );
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isPasswordMatch = await compare(password, user.password);
    if (!isPasswordMatch) {
      this.loggerService.error(
        JSON.stringify({
          message: 'loginUser: Invalid password',
          data: { email },
        }),
      );
      throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
    }

    const payload = {
      sub: user._id,
      roles: user.roles,
      access_code: user.access_code,
    };

    this.loggerService.log(
      JSON.stringify({
        message: 'loginUser: User login successful',
        data: { userId: user._id },
      }),
    );

    return responseGenerator('Login Successful', {
      ...user.toObject(),
      access_token: await this.jwtService.signAsync(payload),
    });
  }

  async signUp(body: SignUpDto) {
    const { email, password } = body;

    this.loggerService.log(
      JSON.stringify({
        message: 'signUp: Checking if user already exists - Start',
        data: { email },
      }),
    );

    const isUserAlreadyExist = await this.userModel.findOne({ email });
    if (isUserAlreadyExist) {
      this.loggerService.error(
        JSON.stringify({
          message: 'signUp: User already exists',
          data: { email },
        }),
      );
      throw new HttpException(
        { message: 'User already exist with this email', exist: true },
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await hash(password, 10);
    const user = new this.userModel({
      ...body,
      password: hashedPassword,
    });

    const otp = this.otpGenerator();

    this.loggerService.log(
      JSON.stringify({
        message: 'signUp: Sending OTP email - Start',
        data: { email, otp },
      }),
    );

    await this.mailService.sendOTPMailToUser(user.email, otp);

    await user.save();

    this.loggerService.log(
      JSON.stringify({
        message: 'signUp: Saving OTP in cache - Start',
        data: { userId: user._id, otp },
      }),
    );

    await this.cacheManager.set(
      user._id as string,
      otp.toString(),
      MINUTES.TEN,
    );

    this.loggerService.log(
      JSON.stringify({
        message: 'signUp: User registration successful',
        data: { userId: user._id },
      }),
    );

    return responseGenerator(`Successfully sent otp to ${email}`, {
      userId: user._id,
    });
  }

  async google(body: GoogleResponseDTO) {
    this.loggerService.log(
      JSON.stringify({
        message: 'google: User google data',
        data: body,
      }),
    );
    try {
      const dbUser = await this.userModel.findOne({ email: body.email });
      
      if (dbUser) {
        const payload = {
          sub: dbUser._id,
          google_id: dbUser.google_id,
          name: dbUser.name,
          email: dbUser.email,
          credits: dbUser.credits,
          phone: dbUser.phone,
          is_verified: dbUser.is_verified,
          _id: dbUser._id,
          roles: dbUser.roles,
          access_code: dbUser.access_code,
          is_youtube_authenticated: dbUser.is_youtube_authenticated,
          is_google_authenticated: dbUser.is_youtube_authenticated,
        };
        await dbUser.save();
        const token = await this.jwtService.signAsync(payload);
        return token;
      }
      const newUser = new this.userModel({
        email: body.email,
        name: body.name,
        google_id: body.id,
        google_access_token: body.accessToken,
        google_refresh_token: body.refreshToken,
        is_google_authenticated: true,
        is_verified: true,
      });
      await newUser.save();

      const payload = {
        sub: newUser._id,
        google_id: newUser.google_id,
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles,
        access_code: newUser.access_code,
        credits: newUser.credits,
        phone: newUser.phone,
        _id: newUser._id,
        is_verified: newUser.is_verified,
        is_google_authenticated: newUser.is_google_authenticated,
        is_youtube_authenticated: newUser.is_youtube_authenticated,
      };
      const token = await this.jwtService.signAsync(payload);

      return token;
    } catch (error) {
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: Error,
      });
    }
  }

  async youtube(body: YoutubeResponseDTO) {
    this.loggerService.log(
      JSON.stringify({
        message: 'youtube: User google data',
        data: body,
      }),
    );
    try {
      const user = await this.userModel.findOne({ google_id: body.id });

      if (!user)
        throw new HttpException(
          'No user with this Id exist in our db, please first authenticate with google',
          HttpStatus.NOT_FOUND,
        );

      user.google_access_token = body.accessToken;
      user.google_refresh_token = body.refreshToken;
      user.is_youtube_authenticated = true;

      await user.save();

      const payload = {
        sub: user._id,
        google_id: user.google_id,
        name: user.name,
        email: user.email,
        credit: user.credits,
        phone: user.phone,
        _id: user._id,
        is_verified: user.is_verified,
        is_youtube_authenticated: user.is_youtube_authenticated,
        is_google_authenticated: user.is_google_authenticated,
      };

      const token = await this.jwtService.signAsync(payload);

      return token;
    } catch (error: any) {
      throw new HttpException(
        error?.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: Error,
        },
      );
    }
  }

  async verifyOtp(userId: string, otp: number) {
    this.loggerService.log(
      JSON.stringify({
        message: 'verifyOtp: Retrieving user from database - Start',
        data: { userId, otp },
      }),
    );

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.loggerService.error(
        JSON.stringify({
          message: 'verifyOtp: User not found',
          data: { userId },
        }),
      );
      throw new HttpException(
        'User not exist with this ID',
        HttpStatus.NOT_FOUND,
      );
    }

    const registeredOtp = await this.cacheManager.get(userId);
    if (!registeredOtp || parseInt(registeredOtp as string) !== otp) {
      this.loggerService.error(
        JSON.stringify({
          message: 'verifyOtp: Invalid or expired OTP',
          data: { userId, otp },
        }),
      );
      throw new HttpException(
        'Invalid OTP or no OTP registered for this email',
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.is_verified = true;
    await user.save();
    await this.cacheManager.del(userId);

    const payload = {
      sub: user._id,
      access_code: user.access_code,
      roles: user.roles,
    };

    this.loggerService.log(
      JSON.stringify({
        message: 'verifyOtp: OTP verification successful',
        data: { userId },
      }),
    );

    return responseGenerator('Verification Successful', {
      ...user.toObject(),
      access_token: await this.jwtService.signAsync(payload),
    });
  }

  otpGenerator() {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return Number(otp);
  }
}
