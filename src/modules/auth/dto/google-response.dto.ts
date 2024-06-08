import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class GoogleResponseDTO {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsString()
  @IsNotEmpty()
  picture: string;
}
