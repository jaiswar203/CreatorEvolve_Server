import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { LoginDTO } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
import { SignUpDto } from '../dto/signup.dto';
import { Serialize } from 'interceptors/serialize.interceptor';
import { UserResponseDto } from '@/modules/user/dto/user.response.dto';
import { AuthGuard } from '@nestjs/passport';
import { GoogleResponseDTO } from '../dto/google-response.dto';
import { ConfigService } from '@nestjs/config';
import { YoutubeResponseDTO } from '../dto/youtube-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    return await this.authService.signUp(body);
  }

  @Serialize(UserResponseDto)
  @Post('signin')
  async loginUser(@Body() body: LoginDTO) {
    return await this.authService.loginUser(body);
  }

  @Serialize(UserResponseDto)
  @Get('verify-otp/:userId')
  async verifyOTP(@Param('userId') userId: string, @Query('otp') otp: string) {
    return this.authService.verifyOtp(userId, parseInt(otp));
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('youtube')
  @UseGuards(AuthGuard('youtube'))
  async youtubeAuth(@Req() req) {}

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: any) {
    if (!req.user) {
      return {
        url: `${this.configService.get('CLIENT_URL')}/auth/redirect?error=true`,
      };
    }
    const userDetail: GoogleResponseDTO = req.user;

    const access_token = await this.authService.google(userDetail);

    const redirectUrl = new URL(
      `${this.configService.get('CLIENT_URL')}/auth/redirect?token=${access_token}&auth_type=google`,
    );

    res.redirect(HttpStatus.FOUND, redirectUrl);
  }

  @Get('youtube/redirect')
  @UseGuards(AuthGuard('youtube'))
  async youtubeAuthRedirect(@Req() req, @Res() res: any) {
    if (!req.user) {
      return {
        url: `${this.configService.get('CLIENT_URL')}/auth/redirect?error=true`,
      };
    }
    const userDetail: YoutubeResponseDTO = req.user;

    const access_token = await this.authService.youtube(userDetail);

    const redirectUrl = new URL(
      `${this.configService.get('CLIENT_URL')}/auth/redirect?token=${access_token}&auth_type=google`,
    );

    res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
