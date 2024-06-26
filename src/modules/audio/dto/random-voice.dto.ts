import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class GenerateVoiceDto {
  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsString()
  @IsNotEmpty()
  accent: string;

  @IsNumber()
  @Min(0)
  @Max(200)
  @Transform(({ value }) => value / 100)
  accent_strength: number;

  @IsString()
  @IsNotEmpty()
  text: string;
}
