import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './services/auth.service';
import { UserModule } from '@/modules/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/schemas/users/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '@/common/mail/mail.module';
import { GoogleStrategy } from 'strategy/google.strategy';
import { YoutubeStrategy } from 'strategy/youtube.strategy';

@Module({
  imports: [
    UserModule,
    MailModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, YoutubeStrategy],
})
export class AuthModule {}
