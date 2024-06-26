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
import { TextToSpeechDTO } from '../dto/text-to-speech.dto';
import { InstantVoiceCloneDto } from '../dto/instant-clone.dto';
import { GenerateRandomVoiceRequest } from '@/libs/elevenlabs/services/elevenlabs.service';
import { GenerateVoiceDto } from '../dto/random-voice.dto';
import { SaveRandomGeneratedVoiceDto } from '../dto/save-random-voice.dto';
import { ProfessionalVoiceCloneInquiryDto } from '../dto/professiona-voice-clone-inqury.dto';

@Controller('media/audios')
@UseGuards(AuthGuard)
export class AudioController {
  constructor(
    private audioService: AudioService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get('/voices')
  async getVoicesList(@Req() req: any) {
    return this.audioService.getVoicesList(req.user.sub);
  }

  @Get('/voices/shared')
  async getSharedVoicesList() {
    return this.audioService.getSharedVoicesList();
  }

  @Post('/voices/add')
  async InstantClone(@Req() req: any, @Body() body: InstantVoiceCloneDto) {
    return this.audioService.instantCloneVoice(req.user.sub, body);
  }

  @Get('/voices/random/params')
  async getRandonVoiceGenerationParams() {
    return this.audioService.getRandonVoiceGenerationParams();
  }

  @Post('/voices/random')
  async generateRandomVoice(
    @Req() req: any,
    @Body() body: GenerateVoiceDto,
  ) {
    return this.audioService.generateRandomVoice(req.user.sub, body);
  }

  @Post('/voices/random/save')
  async saveRandomGeneratedVoice(
    @Req() req: any,
    @Body() body: SaveRandomGeneratedVoiceDto,
  ) {
    return this.audioService.saveRandomGeneratedVoice(req.user.sub, body);
  }

  @Post('/voices/professional')
  async professionalVoiceCloning(
    @Req() req: any,
    @Body() body: ProfessionalVoiceCloneInquiryDto,
  ) {
    return this.audioService.professionalVoiceCloning(req.user.sub, body);
  }

  @Post('/voices/add/:public_user_id/:voice_id')
  async addSharedVoiceInLibrary(
    @Param('public_user_id') public_user_id: string,
    @Param('voice_id') voice_id: string,
    @Query('name') name: string,
  ) {
    const decodedName = decodeURIComponent(name);
    return this.audioService.addSharedVoiceInLibrary(
      public_user_id,
      voice_id,
      decodedName,
    );
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

  @Post('/text-to-speech')
  async textToSpeech(@Req() req: any, @Body() body: TextToSpeechDTO) {
    return this.audioService.textToSpeech(req.user.sub, body);
  }

  @Get('/dubbing/all')
  async getMediaDubbings(@Req() req: any) {
    return this.audioService.getDubbings(req.user.sub);
  }

  @Post('/dubbing/:mediaId')
  async audioFile(
    @Req() req: any,
    @Param('mediaId') mediaId: string,
    @Query('type') mediaType: string,
    @Body() body: DubRequestDto,
  ) {
    return this.audioService.dubbing(req.user.sub, mediaId, mediaType, body);
  }

  @Delete('/dubbing/:videoId')
  async deleteAudioFile(@Param('videoId') videoId: string) {
    return this.audioService.removeDubbing(videoId);
  }

  // We're skipping auth because we can't pass headers to EventSource Resource from the client
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
