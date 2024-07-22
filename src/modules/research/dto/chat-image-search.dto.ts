import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ChatImageSearchDTO {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  assistant_answer: string;

  @IsString()
  @IsNotEmpty()
  chat_id: string;

  @IsNumber()
  @IsNotEmpty()
  message_index: number;
}
