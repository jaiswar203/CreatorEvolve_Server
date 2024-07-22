import { IsNotEmpty, IsString } from 'class-validator';

export class ResearchChatDTO {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
