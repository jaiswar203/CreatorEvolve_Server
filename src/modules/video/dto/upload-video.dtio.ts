import { IsNotEmpty, IsString } from "class-validator";

export class UploadVideoDTO{
    @IsNotEmpty()
    @IsString()
    url:string

    @IsNotEmpty()
    @IsString()
    thumbnail:string

    @IsNotEmpty()
    @IsString()
    name:string
}