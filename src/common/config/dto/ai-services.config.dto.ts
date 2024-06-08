import { IsNotEmpty, IsString } from "class-validator";

export class AIServiceConfigDTO{
    @IsString()
    @IsNotEmpty()
    OPEN_AI_API_KEY:string

    @IsString()
    @IsNotEmpty()
    TWELVE_LABS_API_KEY:string

    @IsString()
    @IsNotEmpty()
    TWELVE_LABS_BASE_URL:string

    @IsString()
    @IsNotEmpty()
    TWELVE_LABS_SIGNING_SECRET:string

    @IsString()
    @IsNotEmpty()
    PERPLEXITY_API_KEY:string
}