import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class TextToSpeechDTO {
  @IsString()
  @IsNotEmpty()
  voice_id: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => value / 100)
  stability?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => value / 100)
  similarity_boost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => value / 100)
  style?: number;

  @IsOptional()
  @IsBoolean()
  use_speaker_boost?: boolean;
}
