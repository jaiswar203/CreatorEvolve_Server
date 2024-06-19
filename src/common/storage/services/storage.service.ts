import { ConfigService } from '@/common/config/services/config.service';
import { HttpService } from '@/common/http/services/http.service';
import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { lastValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import * as ytdl from 'ytdl-core';
import { exec } from 'child_process';
import { LoggerService } from '@/common/logger/services/logger.service';

@Injectable()
export class StorageService {
  private readonly s3: S3;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private loggerService: LoggerService,
  ) {
    this.s3 = new S3();
  }

  async upload(dataBuffer: Buffer, filename: string, mimetype: string) {
    this.loggerService.log('Uploading file to S3', 'StorageService');
    const uploadResult = await this.s3
      .upload({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Body: dataBuffer,
        Key: `${uuid()}-${filename}`,
        ACL: 'public-read',
        ContentType: mimetype,
      })
      .promise();

    const filePath = this.extractFileNameFromS3Url(uploadResult.Location);
    this.loggerService.log(`File uploaded to S3 with key: ${filePath}`, 'StorageService');

    return filePath;
  }

  async uploadStream(stream: NodeJS.ReadableStream, filename: string, mimetype: string): Promise<string> {
    const uploadParams = {
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: `${uuid()}-${filename}`,
      Body: stream,
      ACL: 'public-read',
      ContentType: mimetype,
    };

    const uploadResult = await this.s3.upload(uploadParams).promise();

    const filePath = this.extractFileNameFromS3Url(uploadResult.Location);
    this.loggerService.log(`File uploaded to S3 with key: ${filePath}`, 'StorageService');

    return filePath;
  }

  private removeSpecialCharacters(str: string): string {
    return str.replace(/[<>:"/\\|?*]+/g, '');
  }


  private createDirectoryIfNotExists(directory: string) {
    if (!existsSync(directory)) {
      mkdirSync(directory);
      this.loggerService.log(`Directory created: ${directory}`, 'StorageService');
    }
  }

  async downloadHQYouTubeVideo(url: string): Promise<string> {
    try {
      const videoInfo = await ytdl.getInfo(url);
      const videoTitle = this.removeSpecialCharacters(videoInfo.videoDetails.title);
      this.loggerService.log(`Downloading YouTube video: ${videoTitle}`, 'StorageService');

      const uploadDir = join(__dirname, '..', '..', 'uploads');
      this.createDirectoryIfNotExists(uploadDir);

      const videoFilePath = join(uploadDir, `${videoTitle}_video.mp4`);
      const audioFilePath = join(uploadDir, `${videoTitle}_audio.m4a`);
      const outputFilePath = join(uploadDir, `${videoTitle}.mp4`);

      if (existsSync(outputFilePath)) {
        this.loggerService.error(`File "${outputFilePath}" already exists. Skipping.`, '', 'StorageService');
        return outputFilePath;
      }

      this.loggerService.log('Downloading video stream...', 'StorageService');
      const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestvideo' });
      const videoStream = ytdl.downloadFromInfo(videoInfo, { format: videoFormat });
      videoStream.pipe(createWriteStream(videoFilePath));
      await new Promise((resolve) => videoStream.on('end', resolve));

      this.loggerService.log('Downloading audio stream...', 'StorageService');
      const audioFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio' });
      const audioStream = ytdl.downloadFromInfo(videoInfo, { format: audioFormat });
      audioStream.pipe(createWriteStream(audioFilePath));
      await new Promise((resolve) => audioStream.on('end', resolve));

      this.loggerService.log('Merging video and audio streams...', 'StorageService');
      const mergeCommand = `ffmpeg -i "${videoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac "${outputFilePath}"`;
      await new Promise<void>((resolve, reject) => {
        exec(mergeCommand, (error, stdout, stderr) => {
          if (error) {
            this.loggerService.error(`Error merging: ${error.message}`, '', 'StorageService');
            reject(error);
          } else {
            this.loggerService.log(`Video downloaded and merged: ${videoTitle}`, 'StorageService');
            unlinkSync(videoFilePath);
            unlinkSync(audioFilePath);
            resolve();
          }
        });
      });

      return outputFilePath;
    } catch (error:any) {
      this.loggerService.error(`Error processing video: ${error.message}`, '', 'StorageService');
      throw error;
    }
  }

  async downloadVideo(url: string, filename: string): Promise<string> {
    if (!url) return;
    try {
      this.loggerService.log(`Downloading video from URL: ${url}`, 'StorageService');
      let videoPath = join(__dirname, '..', '..', '../..', 'uploads', filename);
      let writer = createWriteStream(videoPath);

      if (ytdl.validateURL(url)) {
        this.loggerService.log('Detected YouTube URL, downloading via ytdl-core', 'StorageService');
        const youtubeStream = ytdl(url, {
          quality: 'highestvideo',
          filter: 'videoandaudio',
        });
        youtubeStream.pipe(writer);
      } else {
        this.loggerService.log('Downloading video via HTTP', 'StorageService');
        const response = await lastValueFrom(
          this.httpService.get(url, { responseType: 'stream' }),
        );

        response.data.pipe(writer);
      }

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.loggerService.log(`Video downloaded to: ${videoPath}`, 'StorageService');
          resolve(videoPath);
        });
        writer.on('error', (error) => {
          this.loggerService.error(`Error downloading video: ${error.message}`, '', 'StorageService');
          reject(error);
        });
      });
    } catch (error: any) {
      this.loggerService.error(`Error downloading video: ${error.message}`, '', 'StorageService');
      throw new Error(JSON.stringify(error));
    }
  }

  get(filename: string) {
    if (!filename) return;

    const fileUrl = `${this.configService.get('AWS_CLOUDFRONT_DISTRIBUTION')}/${filename}`;
    this.loggerService.log(`Retrieved file URL: ${fileUrl}`, 'StorageService');
    return fileUrl;
  }

  async delete(filename: string) {
    if (!filename) {
      const errorMessage = 'Filename is required for deletion';
      this.loggerService.error(errorMessage, '', 'StorageService');
      throw new Error(errorMessage);
    }

    const params = {
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: filename,
    };

    try {
      await this.s3.deleteObject(params).promise();
      this.loggerService.log(`File successfully deleted from S3: ${filename}`, 'StorageService');
      return { message: 'File successfully deleted from S3' };
    } catch (error) {
      this.loggerService.error('Error deleting file from S3', '', 'StorageService');
      throw new Error('Error deleting file from S3');
    }
  }

  extractFileNameFromS3Url(url: string) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      this.loggerService.log(`Extracted filename from S3 URL: ${filename}`, 'StorageService');
      return filename;
    } catch (error) {
      this.loggerService.error('Error extracting filename from S3 URL', '', 'StorageService');
      return null;
    }
  }
}
