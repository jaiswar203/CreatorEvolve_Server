import { IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDTO {
  @IsString()
  @IsOptional()
  document: string;

  @IsString()
  @IsOptional()
  name: string;
}
