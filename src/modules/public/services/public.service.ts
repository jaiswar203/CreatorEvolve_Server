import { LoggerService } from '@/common/logger/services/logger.service';
import { VideoService } from '@/modules/video/services/video.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TWelveLabsTaskStatusDto } from '../dto/twelvelabs.webhook.dto';
import { AudioService } from '@/modules/audio/services/audio.service';

@Injectable()
export class PublicService {
  constructor(
    private loggerService: LoggerService,
    private videoService: VideoService,
    private audioService: AudioService,
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
      throw new HttpException(JSON.stringify(error), HttpStatus.BAD_GATEWAY);
    }
  }

  async dolbyJobStatus(data: any) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Dolby job status received',
          data: {
            path: data?.path,
            job_id: data?.job_id,
            status: data?.status,
          },
        }),
      );

      if (data?.path === '/media/diagnose') {
        this.loggerService.log(
          JSON.stringify({
            message: 'Saving diagnosis result',
            data: { job_id: data?.job_id, status: data?.status },
          }),
        );
        await this.audioService.saveDiagnoseResult(
          data?.job_id,
          data?.status,
          data?.result?.audio,
          data?.result?.media_info,
        );
      }
      if (data?.path === '/media/enhance') {
        this.loggerService.log(
          JSON.stringify({
            message: 'Saving enhance result',
            data: { job_id: data?.job_id, status: data?.status },
          }),
        );
        await this.audioService.saveEnhanceResult(data?.job_id, data?.status);
      }

      this.loggerService.log(
        JSON.stringify({
          message: 'Dolby job status processed',
          data: data,
        }),
      );
      return 'Success';
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in dolbyJobStatus',
          data: { error },
        }),
      );
      throw new HttpException(JSON.stringify(error), HttpStatus.BAD_GATEWAY);
    }
  }
}
