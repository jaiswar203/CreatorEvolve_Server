import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Engine {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsNotEmpty()
  options: string[];
}

class Metadata {
  @IsNotEmpty()
  duration: number;
}

class Data {
  @IsString()
  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @Type(() => Metadata)
  metadata: Metadata;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Engine)
  engines: Engine[];

  @IsOptional()
  tags: any;
}

export class TWelveLabsTaskStatusDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  created_at: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => Data)
  data: Data;
}
