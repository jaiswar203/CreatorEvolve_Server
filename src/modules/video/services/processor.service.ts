import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { join } from 'path';
import { secondsToHms } from '../helper/convertSecsToHS';
import { LoggerService } from '@/common/logger/services/logger.service';
import { StorageService } from '@/common/storage/services/storage.service';
import { readFileSync } from 'fs';
import { readFile, unlink } from 'fs/promises';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface ISegment {
  start: number;
  end: number;
}

export interface ISegmentCrop {
  width: number;
  height: number;
  x: number;
  y: number;
}

@Injectable()
export class VideoProcessorService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly storageService: StorageService,
  ) {}

  async extractShortContent(
    videoPath: string,
    segments: ISegment[],
    videoExtention: string,
    crop?: ISegmentCrop,
    metadata?: { width: number; height: number },
    aspect?: string,
  ): Promise<string[]> {
    const outputFiles: string[] = [];
    try {
      for (const segment of segments) {
        const outputFilePath = join(
          __dirname,
          '..',
          '..',
          '../..',
          'uploads',
          `segment-${Date.now()}.mp4`,
        );
        this.loggerService.log(
          `extractShortContent: -------- Extracting segment from ${segment.start} to ${segment.end} of aspect ${aspect} --------`,
        );
        await this.extractSegment(
          videoPath,
          segment.start,
          segment.end,
          crop,
          outputFilePath,
          metadata,
          aspect,
        );

        const fileBuffer = readFileSync(outputFilePath);

        // Saving video in s3
        const s3FilePath = await this.storageService.upload(
          fileBuffer,
          `segment-${Date.now()}.mp4`,
          `video/${videoExtention}`,
        );

        await unlink(outputFilePath);

        outputFiles.push(s3FilePath);
      }
    } catch (error) {
      console.log({ error });
      this.loggerService.error(
        `extractShortContent: -------- Error during video extraction: ${JSON.stringify(error)} --------`,
      );
      throw new HttpException(
        'Error during video extraction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return outputFiles;
  }

  private extractSegment(
    videoPath: string,
    startTime: number,
    endTime: number,
    crop: { width: number; height: number; x: number; y: number } | undefined,
    outputFilePath: string,
    metadata?: { width: number; height: number },
    aspect?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = secondsToHms(startTime);
      const end = secondsToHms(endTime);

      this.loggerService.log(
        `extractSegment: -------- Video Duration: start=${start}, end=${end}, crop=${JSON.stringify(crop)} --------`,
      );

      const { width, height } = metadata || {};

      let command = ffmpeg(videoPath)
        .setStartTime(start)
        .setDuration(end)
        .output(outputFilePath);

      if (crop) {
        command = command.videoFilters(
          `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
        );
      } else {
        const aspectRatio = aspect ? Number(aspect) : 9 / 16;
        const cropWidth = Math.min(width, height * aspectRatio);
        const cropHeight = Math.min(height, width / aspectRatio);
        const x = (width - cropWidth) / 2;
        const y = (height - cropHeight) / 2;

        command = command.videoFilters([
          {
            filter: 'crop',
            options: {
              w: cropWidth,
              h: cropHeight,
              x,
              y,
            },
          },
        ]);

        this.loggerService.log(
          `extractSegment: -------- Video Ratio: cropWidth=${cropWidth}, cropHeight=${cropHeight}, x=${x}, y=${y}, aspectRatio=${aspectRatio} --------`,
        );
      }

      command
        .on('end', () => {
          this.loggerService.log(
            `extractSegment: -------- Segment extracted to ${outputFilePath} --------`,
          );
          resolve();
        })
        .on('error', (err) => {
          this.loggerService.error(
            `extractSegment: -------- Error extracting segment: ${err.message} --------`,
          );
          reject(
            new HttpException(
              'Error extracting segment',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        })
        .run();
    });
  }

  async extractThumbnail(
    videoPath: string,
    atTime: number = 0,
  ): Promise<string> {
    const tempThumbnailPath = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'uploads',
      `thumbnail-${Date.now()}.webp`,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [atTime],
          filename: tempThumbnailPath,
          quality: 1,
        })
        .on('end', async () => {
          try {
            const fileBuffer = await readFile(tempThumbnailPath);
            const s3FilePath = await this.storageService.upload(
              fileBuffer,
              `thumbnail-${Date.now()}.webp`,
              'image/webp',
            );
            await unlink(tempThumbnailPath);
            this.loggerService.log(
              `extractThumbnail: -------- Thumbnail extracted and uploaded to ${s3FilePath} --------`,
            );
            resolve(s3FilePath);
          } catch (error: any) {
            this.loggerService.error(
              `extractThumbnail: -------- Error uploading thumbnail: ${error.message} --------`,
            );
            reject(
              new HttpException(
                'Error uploading thumbnail',
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
            );
          }
        })
        .on('error', (err) => {
          this.loggerService.error(
            `extractThumbnail: -------- Error extracting thumbnail: ${err.message} --------`,
          );
          reject(
            new HttpException(
              'Error extracting thumbnail',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        });
    });
  }

  
}
