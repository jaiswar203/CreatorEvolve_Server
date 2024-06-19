import { TwelveLabs } from 'twelvelabs-js';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { IENGINES, TLIndex } from '@/db/schemas/services/tl.index.schema';
import { Model } from 'mongoose';
import {
  TL_DEFAULT_GENERATE_TEXT_TYPE,
  TL_DEFAULT_NAME,
  TL_Default_Engine,
  TL_GENERATE_TEXT_TYPES,
  TL_GENERATE_TYPES,
} from '@/common/constants/tl.enum';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '@/common/logger/services/logger.service';
import { CHAPTER_CUSTOM_PROMPT } from '@/common/constants/video.enum';
import { GenerateSummarizeChapterResult } from 'twelvelabs-js/dist/models';

export class TwelveLabsService {
  private client: TwelveLabs;
  constructor(
    private configService: ConfigService,
    @InjectModel(TLIndex.name) private tlIndexModel: Model<TLIndex>,
    private loggerService: LoggerService,
  ) {
    this.client = new TwelveLabs({
      apiKey: this.configService.get<string>('TWELVE_LABS_API_KEY'),
    });
  }

  async createIndex(
    name: TL_DEFAULT_NAME | string = TL_DEFAULT_NAME.YOUTUBE_VIDEOS,
    engines: IENGINES[] = TL_Default_Engine,
  ) {
    this.loggerService.log(`createIndex: Creating index with name: ${name}`);

    let index = await this.client.index.create({
      name: name as string,
      engines,
    });

    this.loggerService.log(`createIndex: Index created with id: ${index.id}`);

    const tlIndex = new this.tlIndexModel({
      name,
      tl_index_id: index.id,
      engines: index.engines,
    });

    this.loggerService.log(`createIndex: Saving index to DB`);

    return await tlIndex.save();
  }

  async uploadYTVideoTask(indexId: string, url: string) {
    this.loggerService.log(
      `uploadYTVideoTask: Uploading YouTube video to index: ${indexId}, URL: ${url}`,
    );

    const task = await this.client.task.externalProvider(indexId, url);

    this.loggerService.log(
      `uploadYTVideoTask: Video uploaded with task id: ${task.id}`,
    );

    return task.id;
  }

  async uploadVideosTask(indexId: string, videosPath: string[]) {
    try {
      this.loggerService.log(
        `uploadVideosTask: Uploading videos to index: ${indexId}`,
      );

      const taskIds = [];
      for (const videoPath of videosPath) {
        this.loggerService.log(`uploadVideosTask: Uploading ${videoPath}`);

        const task = await this.client.task.create({
          indexId,
          file: videoPath,
        });

        this.loggerService.log(
          `uploadVideosTask: Created task with id: ${task.id}`,
        );

        taskIds.push(task.id);
      }

      this.loggerService.log(
        `uploadVideosTask: All videos uploaded with task ids: ${taskIds}`,
      );

      return taskIds;
    } catch (error) {
      console.log({ error });
      this.loggerService.error(
        JSON.stringify({
          message: `uploadVideosTask: Error occured`,
          error,
        }),
      );
    }
  }

  async retrieveThumbnail(videoId: string) {
    if (!videoId) return;

    const index = await this.findIndexByName();

    this.loggerService.log(
      `retrieveThumbnail: Retrieving thumbnail from video ${videoId}`,
    );

    const thumbnail = await this.client.index.video.thumbnail(index, videoId);

    this.loggerService.log(
      `retrieveThumbnail: Retrieved thumbnail from video ${thumbnail}`,
    );

    return thumbnail;
  }

  async findIndexByName(
    name: TL_DEFAULT_NAME | string = TL_DEFAULT_NAME.YOUTUBE_VIDEOS,
  ) {
    this.loggerService.log(`findIndexByName: Finding index with name: ${name}`);

    const index = await this.tlIndexModel.findOne({ name });
    if (!index) {
      this.loggerService.log(
        `findIndexByName: No index found with name: ${name}`,
      );
      throw new HttpException('No index with name', HttpStatus.NOT_FOUND);
    }

    this.loggerService.log(
      `findIndexByName: Found index with id: ${index.tl_index_id}`,
    );

    return index.tl_index_id;
  }

  async generateGistFromVideo(
    videoId: string,
    videoTypes: TL_GENERATE_TEXT_TYPES[],
  ) {
    this.loggerService.log(
      `generateTextFromVideo: Generating text for video: ${videoId}`,
    );

    const gist = await this.client.generate.gist(
      videoId,
      videoTypes ?? TL_DEFAULT_GENERATE_TEXT_TYPE,
    );

    this.loggerService.log(
      `generateTextFromVideo: Text generated for video: ${videoId}`,
    );

    return gist;
  }

  async generateTextFromVideo(videoId: string, prompt: string) {
    this.loggerService.log(
      `generateTextFromVideo: Generating text for video: ${videoId} with prompt:${prompt}`,
    );

    const text = await this.client.generate.text(videoId, prompt, 0.7);

    this.loggerService.log(
      `generateTextFromVideo: Text generated for video: ${videoId}`,
    );

    return text;
  }

  async generateSummaryFromVideo(videoId: string, prompt?: string) {
    this.loggerService.log(
      `generateSummaryFromVideo: Generating summary for video: ${videoId}`,
    );

    const data = await this.client.generate.summarize(
      videoId,
      TL_GENERATE_TYPES.SUMMARY,
      prompt ?? null,
      0.1,
    );

    this.loggerService.log(
      `generateSummaryFromVideo: Summary generated for video: ${videoId}`,
    );

    return data.summary;
  }

  async generateChaptersFromVideo(
    videoId: string,
    prompt?: string,
  ): Promise<GenerateSummarizeChapterResult[]> {
    this.loggerService.log(
      `generateChaptersFromVideo: Generating chapters for video: ${videoId}`,
    );

    const data = await this.client.generate.summarize(
      videoId,
      TL_GENERATE_TYPES.CHAPTER,
      prompt ?? CHAPTER_CUSTOM_PROMPT,
      0.1,
    );

    this.loggerService.log(
      `generateChaptersFromVideo: Chapters generated for video: ${videoId}`,
    );

    return data.chapters;
  }

  async generateHighLightsFromVideo(videoId: string, prompt?: string) {
    this.loggerService.log(
      `generateHighLightsFromVideo: Generating highlights for video: ${videoId}`,
    );

    const data = await this.client.generate.summarize(
      videoId,
      TL_GENERATE_TYPES.HIGHLIGHT,
      prompt ?? null,
      0.1,
    );

    this.loggerService.log(
      `generateHighLightsFromVideo: Highlights generated for video: ${videoId}`,
    );

    return data;
  }

  async retrieveTaskInfo(taskId: string) {
    this.loggerService.log(
      `retrieveTaskInfo: Retrieving task information for ${taskId}`,
    );

    const taskInfo = await this.client.task.retrieve(taskId);

    this.loggerService.log(
      `retrieveTaskInfo: Retrieved task information for ${taskId}`,
    );

    return taskInfo;
  }

  async retrieveVideoInfo(videoId: string) {
    this.loggerService.log(
      `retrieveVideoInfo: Retrieving video information for ${videoId}`,
    );

    const indexId = await this.findIndexByName();

    const videoInfo = await this.client.index.video.retrieve(indexId, videoId);

    this.loggerService.log(
      JSON.stringify({
        message: `retrieveVideoInfo: Retrieved video information for ${videoId}`,
      }),
    );
    return videoInfo;
  }

  async generateShortContent(videoId: string, prompt?: string) {
    this.loggerService.log(
      `generateShortContent: Generating short content for video: ${videoId}`,
    );

    const chapters = await this.generateChaptersFromVideo(videoId, prompt);

    const segments = [];

    chapters.map((chapter) => {
      segments.push({
        start: chapter.start,
        end: chapter.end,
        title: chapter.chapterTitle,
        summary: chapter.chapterSummary,
      });
    });

    this.loggerService.log(
      `generateShortContent: Generated short content for video: ${videoId}`,
    );

    return segments;
  }
}
