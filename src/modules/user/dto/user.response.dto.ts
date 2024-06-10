import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class UserResponseDto {
  @IsString()
  @IsNotEmpty()
  @Expose()
  _id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @Expose()
  email: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  @Expose()
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  @Expose()
  credits: string;

  @IsBoolean()
  @IsNotEmpty()
  @Expose()
  is_verified: boolean;

  @IsString()
  @IsNotEmpty()
  @Expose()
  access_token: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  is_google_authenticated: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  is_youtube_authenticated: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  roles: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  access_code: string;
}
