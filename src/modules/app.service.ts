import { LoggerService } from '@/common/logger/services/logger.service';
import { StorageService } from '@/common/storage/services/storage.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class AppService {
  constructor(
    private storageService: StorageService,
    private loggerService: LoggerService,
  ) {}

  async uploadFile(file: Express.Multer.File) {
    this.loggerService.log('uploadFile: Starting file upload process');

    try {
      this.loggerService.log('uploadFile: Converting buffer to stream');
      const fileStream = this.bufferToStream(file.buffer);

      this.loggerService.log(
        `uploadFile: Uploading file to S3 - ${file.originalname}`,
      );
      const resp = await this.storageService.uploadStream(
        fileStream,
        file.originalname,
        file.mimetype,
      );

      this.loggerService.log(
        `uploadFile: File uploaded successfully - ${resp}`,
      );
      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'uploadFile: Error occurred during file upload',
          data: error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  private bufferToStream(buffer: Buffer): Readable {
    this.loggerService.log(
      'bufferToStream: Creating readable stream from buffer',
    );
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // Indicates the end of the stream
    return stream;
  }
}
