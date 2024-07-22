import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ResearchService } from '../services/research.service';
import { Response, Request } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { LoggerService } from '@/common/logger/services/logger.service';
import { SkipInterceptor } from 'interceptors/skip-response.interceptor';
import { UpdateDocumentDTO } from '../dto/update-document.dto';
import { ResearchChatDTO } from '../dto/research-chat.dto';
import { ResearchStartDTO } from '../dto/research-start.dto';
import { ChatImageSearchDTO } from '../dto/chat-image-search.dto';

@Controller('research')
@UseGuards(AuthGuard)
export class ResearchController {
  constructor(
    private researchService: ResearchService,
    private loggerService: LoggerService,
  ) {}

  @Post('chat/:id')
  @SkipInterceptor()
  async researchChat(
    @Res() res: Response,
    @Param('id') chatId: string,
    @Body() body: ResearchChatDTO,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      await this.researchService.researchChat(body.prompt, chatId, res);
    } catch (error: any) {
      this.loggerService.error(
        `Error generating research chat ${chatId} - `,
        error.stack,
      );
      res.status(500).send('Error Occured');
    }
  }

  @Post('/chat/media/search')
  async searchMedia(
    @Query('type') searchType: 'image' | 'video',
    @Body() body: ChatImageSearchDTO,
  ) {
    return this.researchService.searchMediaForChat(
      body.prompt,
      body.assistant_answer,
      body.chat_id,
      body.message_index,
      searchType,
    );
  }

  @Get('/download/:id')
  async downloadResearch(
    @Param('id') researchId: string,
    @Res() res: Response,
  ) {
    return this.researchService.downloadResearch(researchId, res);
  }

  @Patch('/update-document/:id')
  async updateDocument(
    @Param('id') researchId: string,
    @Body() body: UpdateDocumentDTO,
  ) {
    return this.researchService.updateDocument(researchId, body);
  }

  @Post('start')
  async startResearch(@Req() req: Request, @Body() body: ResearchStartDTO) {
    return this.researchService.startChat(
      req.user.sub,
      body.name,
      body.system_prompt,
    );
  }

  @Get('list')
  async getResearches(@Req() req: Request) {
    return this.researchService.getResearchList(req.user.sub);
  }

  @Get('/:id')
  async getResearchById(@Param('id') id: string) {
    return this.researchService.getResearchById(id);
  }

  @Delete('/:id')
  async deleteResearchById(@Param('id') researchId: string) {
    return this.researchService.deleteResearchById(researchId);
  }
}
