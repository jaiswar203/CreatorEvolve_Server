import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class ProfessionalVoiceCloneInquiryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
