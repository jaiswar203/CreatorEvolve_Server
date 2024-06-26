import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class Label {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class SaveRandomGeneratedVoiceDto {
  @IsString()
  @IsNotEmpty()
  voice_name: string;

  @IsString()
  @IsNotEmpty()
  generated_voice_id: string;

  @IsString()
  @IsOptional()
  voice_description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Label)
  labels: Label[];

  @IsString()
  @IsNotEmpty()
  preview_url: string
}
