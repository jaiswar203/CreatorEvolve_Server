import { responseGenerator } from '@/common/config/helper/response.helper';
import {
  TL_DEFAULT_NAME,
  TL_GENERATE_TEXT_TYPES,
} from '@/common/constants/tl.enum';
import {
  CHAPTER_CUSTOM_PROMPT,
  IFormattedDataResponse,
  VIDEO_TYPES,
} from '@/common/constants/video.enum';
import { LoggerService } from '@/common/logger/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Video } from '@/schemas/videos/video.schema';
import { TwelveLabsService } from 'libs/twelvelabs/services/twelvelabs.service';
import { Model } from 'mongoose';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { UploadVideoDTO } from '../dto/upload-video.dtio';
import { createReadStream, createWriteStream, readFileSync } from 'fs';
import { StorageService } from '@/common/storage/services/storage.service';
import { HttpService } from '@/common/http/services/http.service';
import * as ytdl from 'ytdl-core';

import { lastValueFrom } from 'rxjs';
import { ISegmentCrop, VideoProcessorService } from './processor.service';
import {
  CHAT_COMPLETION_RESPONSE_FORMAT,
  OpenAIService,
} from 'libs/openai/services/openai.service';

import { google } from 'googleapis';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<Video>,
    private readonly twelveLabsService: TwelveLabsService,
    private readonly userService: UserService,
    private readonly loggerService: LoggerService,
    private readonly storageService: StorageService,
    private readonly httpService: HttpService,
    private readonly videoProcessorService: VideoProcessorService,
    private readonly openAIService: OpenAIService,
  ) {}

  async getVideosList(userId: string) {
    const videos = await this.userService.getVideosList(userId);

    return responseGenerator('Videos Fetched', videos);
  }

  async getVideoById(videoId: string, accessCode: number): Promise<Video> {
    const video = await this.videoModel
      .findById(videoId)
      .populate({ path: 'user_id', select: 'access_code' })
      .lean();

    const hasAccess = await this.userService.verifyUserAccessCode(
      video.user_id,
      accessCode,
    );

    if (!hasAccess)
      throw new HttpException('Unauthorized Access', HttpStatus.UNAUTHORIZED);

    if (!video)
      throw new HttpException(
        'No video found with this id',
        HttpStatus.NOT_FOUND,
      );

    const videoUrl =
      video.type === VIDEO_TYPES.FILE_UPLOAD
        ? this.storageService.get(video.url)
        : video.url;

    return { ...video, url: videoUrl };
  }

  async uploadYTVideoToTL(userId: string, body: UploadVideoDTO) {
    const { url } = body;
    try {
      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Retrieving TL Index from DB - Start ------------',
          data: TL_DEFAULT_NAME.YOUTUBE_VIDEOS,
        }),
      );

      const tlIndex = await this.twelveLabsService.findIndexByName(
        TL_DEFAULT_NAME.YOUTUBE_VIDEOS,
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Retrieving TL Index from DB - Finished ------------',
          data: tlIndex,
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Uploading Video to TL Index - Start ------------',
          data: url,
        }),
      );

      const taskId = await this.twelveLabsService.uploadYTVideoTask(
        tlIndex,
        url,
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Uploading Video to TL Index - Finished ------------',
          data: { taskId },
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Saving video detail in db - Start ------------',
          data: { taskId, url, userId },
        }),
      );

      const video = new this.videoModel({
        tl_task_id: taskId,
        user_id: userId,
        type: VIDEO_TYPES.YOUTUBE,
        thumbnail: body.thumbnail,
        name: body.name,
        url,
      });

      await video.save();

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Saving video detail in db - Finished ------------',
        }),
      );

      const user = await this.userService.saveVideo(
        userId,
        video._id as string,
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadYTVideoToTL: ---------- Saving video detail in user db - Finished ------------',
          data: user,
        }),
      );

      return responseGenerator('Video uploaded', { taskId });
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error Occured',
          error,
        }),
      );
      throw new HttpException('Error occured', HttpStatus.BAD_GATEWAY);
    }
  }

  async uploadVideosToTL(userId: string, video: Express.Multer.File) {
    this.loggerService.log(
      JSON.stringify({
        message: 'uploadVideosToTL: ---------- Start ------------',
        data: { userId, video: video.originalname },
      }),
    );

    const tlIndex = await this.twelveLabsService.findIndexByName(
      TL_DEFAULT_NAME.YOUTUBE_VIDEOS,
    );

    this.loggerService.log(
      JSON.stringify({
        message: 'uploadVideosToTL: ---------- TL Index Retrieved ------------',
        data: tlIndex,
      }),
    );

    const videoPath = join(
      __dirname,
      '..',
      '..',
      '../..',
      'uploads',
      video.filename,
    );

    this.loggerService.log(
      JSON.stringify({
        message: 'uploadVideosToTL: ---------- Video Path ------------',
        data: videoPath,
      }),
    );

    const taskIds = await this.twelveLabsService.uploadVideosTask(
      tlIndex,
      [videoPath], // Pass as an array
    );

    const fileBuffer = readFileSync(videoPath);

    // Saving video in s3
    const s3FilePath = await this.storageService.upload(
      fileBuffer,
      video.originalname,
      video.mimetype,
    );

    const s3ImageFilePath =
      await this.videoProcessorService.extractThumbnail(videoPath);

    this.loggerService.log(
      JSON.stringify({
        message: 'uploadVideosToTL: ---------- Video Uploaded ------------',
        data: taskIds,
      }),
    );

    for (const taskId of taskIds) {
      const videoDoc = new this.videoModel({
        tl_task_id: taskId,
        user_id: userId,
        type: VIDEO_TYPES.FILE_UPLOAD,
        name: video?.originalname || '',
        url: s3FilePath,
        thumbnail: s3ImageFilePath,
      });

      await videoDoc.save();

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadVideosToTL: ---------- Video Saved to DB ------------',
          data: { taskId, videoId: videoDoc._id },
        }),
      );

      await this.userService.saveVideo(userId, videoDoc._id as string);

      await unlink(videoPath);

      this.loggerService.log(
        JSON.stringify({
          message:
            'uploadVideosToTL: ---------- Video Linked to User ------------',
          data: { userId, videoId: videoDoc._id },
        }),
      );
    }

    return responseGenerator('Video Uploaded', { taskIds });
  }

  async generateGistFromVideo(
    videoId: string,
    types: TL_GENERATE_TEXT_TYPES[],
  ) {
    this.loggerService.log(
      JSON.stringify({
        message:
          'generateGistFromVideo: ---------- Calling TLService - Start ------------',
        data: { videoId, types },
      }),
    );

    const data = await this.twelveLabsService.generateGistFromVideo(
      videoId,
      types,
    );

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateGistFromVideo: ---------- Calling TLService - Completed ------------',
        data,
      }),
    );

    return responseGenerator('Generated', data);
  }

  async generateTextFromVideo(
    videoId: string,
    prompt?: string,
  ): Promise<IFormattedDataResponse> {
    this.loggerService.log(
      JSON.stringify({
        message:
          'generateTextFromVideo: ---------- Calling TLService - Start ------------',
        data: { videoId, prompt },
      }),
    );

    const customPrompt = prompt ?? CHAPTER_CUSTOM_PROMPT;

    const data = await this.twelveLabsService.generateTextFromVideo(
      videoId,
      customPrompt,
    );

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateTextFromVideo: ---------- Calling TLService - Completed ------------',
        data,
      }),
    );

    const customGPTPrompt = `
      TEXT: ${data.data}

      TASK: Your Task is to extract data in proper json format in the below schema
        
      SCHEMA:
        segments: [
          {
            title:".....",
            start:0, // video start time, it should always be in seconds
            end:30 // video end time, it should always be in seconds,
            summary:"..." 
          }
        ]

      CONTEXT: This response is generated from a video understanding service which provided me the response for the below EXTERNAL_VIDEO_SERVICE_PROMPT

      EXTERNAL_VIDEO_SERVICE_PROMPT: 
        ${CHAPTER_CUSTOM_PROMPT}
    `;

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateTextFromVideo: ---------- Calling Open AI Chat completion  - Started ------------',
      }),
    );

    const response = await this.openAIService.chatCompletion({
      prompt: customGPTPrompt,
      response_format: CHAT_COMPLETION_RESPONSE_FORMAT.JSON_OBJECT,
      temperature: 0.1,
    });

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateTextFromVideo: ---------- Calling Open AI Chat completion  - Completed ------------',
        data: response,
      }),
    );

    const parsedResponse: IFormattedDataResponse = JSON.parse(response);

    return parsedResponse;
  }

  async generateSummary(videoId: string, prompt?: string) {
    this.loggerService.log(
      JSON.stringify({
        message:
          'generateSummaryFromVideo[1]: ---------- Calling TLService - Start ------------',
        data: { videoId, prompt },
      }),
    );

    const data = await this.twelveLabsService.generateSummaryFromVideo(
      videoId,
      prompt,
    );

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateSummaryFromVideo[1]: ---------- Calling TLService - Completed ------------',
        data,
      }),
    );

    return responseGenerator('Generated', data);
  }

  async generateChapters(id: string, prompt?: string) {
    try {
      const video = await this.videoModel.findById(id);
      if (!video)
        throw new HttpException('Video not found', HttpStatus.NOT_FOUND);

      this.loggerService.log(
        JSON.stringify({
          message: `generateChapters: Video Found`,
          data: video,
        }),
      );

      const { tl_video_id: videoId } = video;

      this.loggerService.log(
        JSON.stringify({
          message:
            'generateChaptersFromVideo[1]: ---------- Calling TLService - Start ------------',
          data: { videoId, prompt },
        }),
      );

      const data = await this.twelveLabsService.generateChaptersFromVideo(
        videoId,
        prompt,
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'generateChaptersFromVideo[1]: ---------- Calling TLService - Completed ------------',
          data,
        }),
      );

      const transformChapter = data.map((chapter) => ({
        id: chapter.chapterNumber,
        summary: chapter.chapterSummary,
        title: chapter.chapterTitle,
        start: chapter.start,
        end: chapter.end,
      }));

      return responseGenerator('Generated', transformChapter);
    } catch (error) {
      this.loggerService.error(JSON.stringify(error));
      throw new HttpException('Error occured', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async extractShortContent(
    id: string,
    prompt?: string,
    crop?: ISegmentCrop,
    aspect?: string,
  ) {
    try {
      const video = await this.videoModel.findById(id);
      if (!video)
        throw new HttpException('Video not found', HttpStatus.NOT_FOUND);

      this.loggerService.log(
        JSON.stringify({
          message: `extractShortContent: Video Found`,
          data: video,
        }),
      );
      const { url, type: fileType } = video;

      this.loggerService.log(
        JSON.stringify({
          message: `extractShortContent: Downloading Video - Start`,
        }),
      );

      let videoExtention = 'mp4';

      let storageUrl = url;

      let videoPath = '';

      if (fileType === VIDEO_TYPES.YOUTUBE) {
        const filename = `${Date.now()}-video.mp4`;
        videoPath = await this.downloadVideo(storageUrl, filename);
      } else {
        storageUrl = this.storageService.get(url);
        videoExtention = url.split('.').pop().split(/\#|\?/)[0];
        videoPath = await this.downloadVideo(storageUrl, url);
      }

      const videoSegments = await this.generateTextFromVideo(
        video.tl_video_id,
        prompt,
      );

      const segmentsTimeLine = videoSegments.segments.map((videoSegment) => ({
        start: videoSegment.start,
        end: videoSegment.end,
      }));

      this.loggerService.log(
        JSON.stringify({
          message: 'extractShortContent: Timeline generated',
          data: segmentsTimeLine,
        }),
      );

      const extractedFiles =
        await this.videoProcessorService.extractShortContent(
          videoPath,
          segmentsTimeLine,
          videoExtention,
          crop,
          video.metadata,
          aspect,
        );

      await unlink(videoPath);

      this.loggerService.log(
        JSON.stringify({
          message: `extractShortContent: Downloading Video - Completed`,
          data: storageUrl,
        }),
      );

      const reelUrls = extractedFiles.map((file) =>
        this.storageService.get(file),
      );

      const finalData = videoSegments.segments.map((data, index) => {
        return { ...data, url: reelUrls[index] };
      });

      return finalData;
    } catch (error) {
      this.loggerService.error(JSON.stringify(error));
      throw new HttpException('Error occured', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async downloadVideo(url: string, filename: string): Promise<string> {
    if (!url) return;
    try {
      let videoPath = join(__dirname, '..', '..', '../..', 'uploads', filename);
      let writer = createWriteStream(videoPath);

      if (ytdl.validateURL(url)) {
        // If the URL is a YouTube URL, use ytdl-core to download the video
        const youtubeStream = ytdl(url, {
          quality: 'highest',
          filter: 'audioandvideo',
        });
        youtubeStream.pipe(writer);
      } else {
        // For other URLs, use the existing HTTP download logic
        const response = await lastValueFrom(
          this.httpService.get(url, {
            responseType: 'stream',
          }),
        );

        response.data.pipe(writer);
      }

      // Return a promise that resolves when the file is fully written
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(videoPath));
        writer.on('error', (error) => reject(error));
      });
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error downloading video:',
          error,
        }),
      );
      throw new Error(JSON.stringify(error));
    }
  }

  async generateHighlights(videoId: string, prompt?: string) {
    this.loggerService.log(
      JSON.stringify({
        message:
          'generateHighlightsFromVideo[1]: ---------- Calling TLService - Start ------------',
        data: { videoId, prompt },
      }),
    );

    const data = await this.twelveLabsService.generateHighLightsFromVideo(
      videoId,
      prompt,
    );

    this.loggerService.log(
      JSON.stringify({
        message:
          'generateHighlightsFromVideo[1]: ---------- Calling TLService - Completed ------------',
        data,
      }),
    );

    return responseGenerator('Generated', data);
  }

  async retrieveVideoInfoFromTLAndSave(taskId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoIDFromTLAndSave: ---------- Retrieving Video from DB for ${taskId} - Start ------------`,
      }),
    );

    const video = await this.videoModel.findOne({ tl_task_id: taskId });

    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoIDFromTLAndSave: ---------- Retrieving Video from DB for ${taskId} - Completed ------------`,
        data: video,
      }),
    );

    if (!video) {
      this.loggerService.log(
        JSON.stringify({
          message: `retrieveVideoIDFromTLAndSave: Video not found in DB for taskId ${taskId}`,
        }),
      );
      return;
    }

    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoIDFromTLAndSave: ---------- Retrieving Task Info for ${video.tl_task_id} - Start ------------`,
      }),
    );

    const taskInfo = (await this.twelveLabsService.retrieveTaskInfo(
      video.tl_task_id,
    )) as any;

    const videoInfo = await this.twelveLabsService.retrieveVideoInfo(
      taskInfo.videoId,
    );

    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoIDFromTLAndSave: ---------- Retrieving Task Info for ${video.tl_task_id} - Completed ------------`,
      }),
    );

    video.tl_video_id = taskInfo.videoId as string;
    video.metadata.width = videoInfo.metadata.width;
    video.metadata.height = videoInfo.metadata.height;

    await video.save();

    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoIDFromTLAndSave: ---------- Video ID saved to DB for ${taskId} - Completed ------------`,
      }),
    );

    return responseGenerator();
  }

  async uploadToYoutube(
    userId: string,
    videoDetails: any,
    video: Express.Multer.File,
  ) {
    this.loggerService.log(
      JSON.stringify({
        message: `uploadToYoutube: ---------- Uploading Video for user ${userId} - Start ------------`,
      }),
    );

    try {
      const user = await this.userService.getUserById(userId);
      const accessToken = user.google_access_token;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: videoDetails.title,
            description: videoDetails.description,
            tags: videoDetails.tags,
          },
          status: {
            privacyStatus: videoDetails.privacyStatus,
          },
        },
        media: {
          body: createReadStream(video.path),
        },
      });

      await unlink(video.path);

      this.loggerService.log(
        JSON.stringify({
          message: `uploadToYoutube: ---------- Video Uploaded for user ${userId} - Completed ------------`,
          data: response.data,
        }),
      );

      return response.data;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error Uploading video:',
          error,
        }),
      );
      throw new HttpException('Error occured', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async listYoutubeVideos(userId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: `listYoutubeVideos: ---------- Listing Videos for user ${userId} - Start ------------`,
      }),
    );

    try {
      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.loggerService.log(
          JSON.stringify({
            message: `listYoutubeVideos: No user with this id ${userId}`,
          }),
        );
        throw new HttpException('No user with this id', HttpStatus.NOT_FOUND);
      }

      const accessToken = user.google_access_token;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.search.list({
        part: ['id', 'snippet'],
        forMine: true,
        type: ['video'],
        maxResults: 20,
      });

      this.loggerService.log(
        JSON.stringify({
          message: `listYoutubeVideos: Videos retrieved for user ${userId}`,
          data: response.data.items,
        }),
      );

      const videoIds = response.data.items.map((item) => item.id.videoId);

      if (videoIds.length === 0) {
        this.loggerService.log(
          JSON.stringify({
            message: `listYoutubeVideos: No videos found for user ${userId}`,
          }),
        );
        console.log('No videos found.');
        return;
      }

      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      const transformedVideoResponse = videoResponse.data.items.map((item) => ({
        id: item.id,
        thumbnail: item.snippet.thumbnails,
        title: item.snippet.title,
        description: item.snippet.description,
      }));

      this.loggerService.log(
        JSON.stringify({
          message: `listYoutubeVideos: Video details retrieved for user ${userId} - Completed`,
          data: transformedVideoResponse,
        }),
      );

      return transformedVideoResponse;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error Listing videos',
          error,
        }),
      );
      throw new HttpException('Error occured', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }
}
