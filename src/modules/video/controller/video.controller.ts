import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VideoService } from '../services/video.service';
import { UploadVideoDTO } from '../dto/upload-video.dtio';
import { AuthGuard } from '@/common/guards/auth.guard';
import {
  TL_GENERATE_SUMMARY_TYPES,
  TL_GENERATE_TEXT_TYPES,
} from '@/common/constants/tl.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editFileName } from '../utils/editFileName';

@Controller('videos')
@UseGuards(AuthGuard)
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get('')
  async getVideosList(@Req() req: any) {
    return await this.videoService.getVideosList(req.user.sub);
  }

  @Get('/:id')
  async getVideosById(@Param('id') videoId: string) {
    return await this.videoService.getVideoById(videoId);
  }

  @Post('tl/upload/youtube')
  async uploadYTVideoToTL(@Req() req: any, @Body() body: UploadVideoDTO) {
    return await this.videoService.uploadYTVideoToTL(req.user.sub, body);
  }

  @Post('tl/upload/file')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads',
        filename: editFileName,
      }),
    }),
  )
  async uploadVideosVideoToTL(
    @Req() req: any,
    @UploadedFile() video: Express.Multer.File,
  ) {
    return await this.videoService.uploadVideosToTL(req.user.sub, video);
  }

  @Get('tl/generate/gist/:id')
  async generateGistFromVideo(
    @Param('id') videoId: string,
    @Query('types') types: string,
  ) {
    const typesArrays = types
      ? (types.split(',') as TL_GENERATE_TEXT_TYPES[])
      : null;

    return await this.videoService.generateGistFromVideo(videoId, typesArrays);
  }

  @Get('tl/generate/text/:id')
  async generateTextFromVideo(
    @Param('id') videoId: string,
    @Query('prompt') prompt: string,
  ) {
    return await this.videoService.generateTextFromVideo(videoId, prompt);
  }

  @Get('tl/generate/summary/:id')
  async generateSummaryFromVideo(
    @Param('id') videoId: string,
    @Query('prompt') prompt: TL_GENERATE_SUMMARY_TYPES,
  ) {
    return await this.videoService.generateSummary(
      videoId,
      decodeURIComponent(prompt) ?? null,
    );
  }

  @Get('tl/generate/chapters/:id')
  async generateChaptersFromVideo(
    @Param('id') videoId: string,
    @Query('prompt') prompt?: string,
  ) {
    return await this.videoService.generateChapters(
      videoId,
      decodeURIComponent(prompt) ?? null,
    );
  }

  @Get('tl/generate/highlights/:id')
  async generateHighlightsFromVideo(
    @Param('id') videoId: string,
    @Query('prompt') prompt: TL_GENERATE_SUMMARY_TYPES,
  ) {
    return await this.videoService.generateHighlights(
      videoId,
      decodeURIComponent(prompt) ?? null,
    );
  }

  @Get('extract/:id')
  async extractShortContent(
    @Param('id') videoId: string,
    @Query('prompt') prompt?: string,
    @Query('crop') crop?: string,
    @Query('aspect') aspect?: string,
  ) {
    const parsedPrompt = prompt ? decodeURIComponent(prompt) : null;
    const parsedCropValue = crop ? JSON.parse(decodeURIComponent(crop)) : null;

    return this.videoService.extractShortContent(
      videoId,
      parsedPrompt,
      parsedCropValue,
      aspect,
    );
  }

  @Post('youtube/upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads',
        filename: editFileName,
      }),
    }),
  )
  async uploadVideoToYoutube(
    @Body() videoDetails: any,
    @Req() req,
    @UploadedFile() video: Express.Multer.File,
  ) {
    return this.videoService.uploadToYoutube(req.user.sub, videoDetails, video);
  }


  @Get("youtube/list")
  async getYoutubeVideosList(@Req() req:any){
    const userId=req.user.sub

    return this.videoService.listYoutubeVideos(userId)
  }
}
