import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class YoutubeResponseDTO {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  id: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
