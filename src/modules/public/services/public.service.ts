import { LoggerService } from '@/common/logger/services/logger.service';
import { VideoService } from '@/modules/video/services/video.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TWelveLabsTaskStatusDto } from '../dto/twelvelabs.webhook.dto';

@Injectable()
export class PublicService {
  constructor(
    private loggerService: LoggerService,
    private videoService: VideoService,
  ) {}

  async tlTaskStatus(data: TWelveLabsTaskStatusDto) {
    try {
      this.loggerService.log(
        'Calling Video Service for TL Video ID Update - Start',
      );

      await this.videoService.retrieveVideoInfoFromTLAndSave(data.data.id);

      this.loggerService.log(
        'Calling Video Service for TL Video ID Update - Completed',
      );

      return {
        success: true,
      };
    } catch (error) {
      console.log({error})
      new HttpException(JSON.stringify(error), HttpStatus.BAD_GATEWAY)
    }
  }
}
