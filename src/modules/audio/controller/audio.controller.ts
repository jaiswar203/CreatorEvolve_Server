import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AudioService } from '../services/audio.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { DubRequestDto } from '../dub.request.dto';
import { Observable, fromEvent, map } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SkipAuth } from '@/common/decorators/skip-auth.decorator';
import { Roles } from '@/common/decorators/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ROLE } from '@/common/constants/roles.enum';
import { editFileName } from '@/modules/video/utils/editFileName';

@Controller('media/audios')
@UseGuards(AuthGuard)
export class AudioController {
  constructor(
    private audioService: AudioService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get('/list')
  async getVoicesList() {
    return this.audioService.getVoicesList();
  }

  @Get('')
  @Roles(ROLE.USER)
  async getVideosList(@Req() req: any) {
    return this.audioService.getAudiosList(req.user.sub);
  }

  @Post('upload')
  @Roles(ROLE.USER)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './uploads',
        filename: editFileName,
      }),
    }),
  )
  async uplaodAudio(
    @Req() req: any,
    @UploadedFile() audio: Express.Multer.File,
  ) {
    return this.audioService.uploadAudio(req.user.sub, audio);
  }

  @Get('/dubbing/all')
  async getMediaDubbings(@Req() req: any) {
    return this.audioService.getDubbings(req.user.sub);
  }

  @Post('/dubbing/:mediaId')
  async audioFile(
    @Req() req: any,
    @Param('mediaId') mediaId: string,
    @Query('type') mediaType:string,
    @Body() body: DubRequestDto,
  ) {
    return this.audioService.dubbing(req.user.sub, mediaId,mediaType, body);
  }

  @Delete('/dubbing/:videoId')
  async deleteAudioFile(@Param('videoId') videoId: string) {
    return this.audioService.removeDubbing(videoId);
  }

  @SkipAuth()
  @Sse('dubbing/events/:id')
  dubbingEvents(@Param('id') id: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, id).pipe(
      map((data: any) => {
        return {
          type: 'message',
          data: JSON.stringify(data),
        } as MessageEvent;
      }),
    );
  }
}
