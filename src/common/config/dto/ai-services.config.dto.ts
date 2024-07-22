import { IsNotEmpty, IsString } from 'class-validator';

export class AIServiceConfigDTO {
  @IsString()
  @IsNotEmpty()
  OPEN_AI_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  TWELVE_LABS_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  TWELVE_LABS_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  TWELVE_LABS_SIGNING_SECRET: string;

  @IsString()
  @IsNotEmpty()
  ELEVEN_LABS_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  ELEVEN_LABS_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DOLBY_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  DOLBY_MEDIA_URI: string;

  @IsString()
  @IsNotEmpty()
  DOLBY_API_SECRET: string;

  @IsString()
  @IsNotEmpty()
  PERPLEXITY_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  PERPLEXITY_API_URL: string;

  @IsString()
  @IsNotEmpty()
  PERPLEXITY_DEFAULT_MODEL: string;
}
