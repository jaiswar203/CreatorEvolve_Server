import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class DubRequestDto {
  @IsNotEmpty()
  @IsString()
  target_lang: string;

  @IsString()
  source_lang: string;

  @IsNumber()
  num_speakers: number;

  @IsBoolean()
  highest_resolution: boolean;

  @IsString()
  @IsOptional()
  start_time: string | null;

  @IsString()
  @IsOptional()
  end_time: string | null;
}
