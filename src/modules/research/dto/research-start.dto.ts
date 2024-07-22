import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResearchStartDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  system_prompt: string;
}
