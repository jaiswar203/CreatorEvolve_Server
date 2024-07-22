import { Module } from '@nestjs/common';
import { ResearchController } from './controller/research.controller';
import { ResearchService } from './services/research.service';
import { PerplexityModule } from '@/libs/perplexity/module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Research,
  ResearchSchema,
} from '@/db/schemas/research/research.schema';
import {
  ResearchChat,
  ResearchChatSchema,
} from '@/db/schemas/research/chat.schema';
import { UserModule } from '../user/user.module';
import { JwtService } from '@nestjs/jwt';
import { OpenAIModule } from '@/libs/openai/openai.module';

@Module({
  imports: [
    PerplexityModule,
    MongooseModule.forFeature([
      {
        name: Research.name,
        schema: ResearchSchema,
      },
      {
        name: ResearchChat.name,
        schema: ResearchChatSchema,
      },
    ]),
    UserModule,
    OpenAIModule,
  ],
  controllers: [ResearchController],
  providers: [ResearchService, JwtService],
})
export class ResearchModule {}
