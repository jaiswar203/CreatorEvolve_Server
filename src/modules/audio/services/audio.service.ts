import { StorageService } from '@/common/storage/services/storage.service';
import { Video } from '@/db/schemas/media/video.schema';
import { ElevenLabsService } from '@/libs/elevenlabs/services/elevenlabs.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Schema } from 'mongoose';
import { DubRequestDto } from '../dub.request.dto';
import { LoggerService } from '@/common/logger/services/logger.service';
import { Dubbing } from '@/db/schemas/media/dubbing.schema';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  DUBBING_QUEUE,
  DUBBING_QUEUE_HANDLER,
} from '@/common/constants/queue.contant';
import { MINUTES } from '@/common/constants/time';
import { UserService } from '@/modules/user/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hmsToSeconds, isValidTimeHMSFormat } from 'utils/time';
import { responseGenerator } from '@/common/config/helper/response.helper';
import { Audio } from '@/db/schemas/media/audio.schema';
import { readFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { VIDEO_TYPES } from '@/common/constants/video.enum';

@Injectable()
export class AudioService {
  constructor(
    private elevenLabsService: ElevenLabsService,
    private storageService: StorageService,
    private loggerService: LoggerService,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
    @InjectModel(Video.name) private videoModel: Model<Video>,
    @InjectModel(Audio.name) private audioModel: Model<Audio>,
    @InjectModel(Dubbing.name) private dubbingModel: Model<Dubbing>,
    @InjectQueue(DUBBING_QUEUE) private dubbingQueue: Queue,
  ) {}

  async getVoicesList() {
    this.loggerService.log(
      JSON.stringify({ message: 'getVoicesList: Fetching voices list' }),
    );
    try {
      const voices = await this.elevenLabsService.getVoicesList();
      this.loggerService.log(
        JSON.stringify({
          message: 'getVoicesList: Voices list fetched successfully',
          data: voices,
        }),
      );
      return voices;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getVoicesList: Failed to fetch voices list',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async getAudiosList(userId: string) {
    this.loggerService.log(
      JSON.stringify({ message: 'getAudiosList: Fetching Audios list' }),
    );
    try {
      const audios = await this.userService.getAudiosList(userId);
      return audios;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getAudiosList: Failed to fetch audios list',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async uploadAudio(userId: string, audio: Express.Multer.File) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'uploadAudio: Start',
          data: { userId, audio: audio.originalname },
        }),
      );

      const audioPath = join(
        __dirname,
        '..',
        '..',
        '../..',
        'uploads',
        audio.filename,
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'uploadAudio: Audio Path',
          data: audioPath,
        }),
      );

      const fileBuffer = readFileSync(audioPath);

      // Saving audio in s3
      const s3FilePath = await this.storageService.upload(
        fileBuffer,
        audio.originalname,
        audio.mimetype,
      );

      await unlink(audioPath);

      this.loggerService.log(
        JSON.stringify({
          message: 'uploadAudio: Audio uploaded to S3',
          data: s3FilePath,
        }),
      );

      const audioDoc = new this.audioModel({
        user_id: userId,
        name: audio?.originalname || '',
        url: s3FilePath,
      });

      const savedAudio = await audioDoc.save();

      this.loggerService.log(
        JSON.stringify({
          message: 'uploadAudio: Audio document saved in DB',
          data: savedAudio,
        }),
      );

      const user = await this.userService.saveAudio(
        userId,
        audioDoc._id as string,
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'uploadAudio: Audio linked to user',
          data: user,
        }),
      );

      const s3ViewUrl = this.storageService.get(audioDoc.url);

      return responseGenerator('Audio uploaded', {
        ...audioDoc.toObject(),
        url: s3ViewUrl,
      });
    } catch (error) {
      console.log({ error });
      this.loggerService.error(
        JSON.stringify({
          message: 'uploadAudio: Error occurred',
          error,
        }),
      );
      throw new HttpException('Error occurred', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async dubbing(
    userId: string,
    mediaId: string,
    mediaType: string,
    body: DubRequestDto,
  ) {
    this.loggerService.log(
      JSON.stringify({
        message: 'dubbing: Starting dubbing process',
        data: { videoId: mediaId, body },
      }),
    );
    try {
      let media: any;

      if (mediaType === 'audio') {
        media = await this.audioModel.findById(mediaId);
      } else {
        media = await this.videoModel.findById(mediaId);
      }

      if (!media) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'dubbing: No video or Audio found',
            data: { videoId: mediaId },
          }),
        );
        throw new HttpException('No Video found', HttpStatus.NOT_FOUND);
      }

      let url: string;

      if (media?.type === VIDEO_TYPES.YOUTUBE) url = media.url;
      else url = this.storageService.get(media.url);

      this.loggerService.log(
        JSON.stringify({
          message: 'dubbing: Requesting dubbing from ElevenLabs',
          data: { url, body },
        }),
      );

      const payload = {
        url,
        target_lang: body.target_lang,
        num_speakers: body.num_speakers,
        highest_resolution: body.highest_resolution,
        source_lang: body.source_lang ?? 'auto',
        start_time: null,
        end_time: null,
      };

      if (body.start_time) {
        const isValid = isValidTimeHMSFormat(body.start_time);
        if (!isValid) {
          this.loggerService.error(
            JSON.stringify({
              message: 'dubbing: Invalid Start time',
            }),
          );
          throw new HttpException(
            'Invalid Start time',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        payload.start_time = hmsToSeconds(body.start_time);
      }

      if (body.end_time) {
        const isValid = isValidTimeHMSFormat(body.end_time);
        if (!isValid) {
          this.loggerService.error(
            JSON.stringify({
              message: 'dubbing: Invalid End time',
            }),
          );
          throw new HttpException(
            'Invalid Start time',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        payload.end_time = hmsToSeconds(body.end_time);
      }

      this.loggerService.log(
        JSON.stringify({
          message: `dubbing: final Payload`,
          data: payload,
        }),
      );

      const dubbing = await this.elevenLabsService.dubbing(payload);

      this.loggerService.log(
        JSON.stringify({
          message: `dubbing: ElevenLabs Dubbing completed`,
          data: payload,
        }),
      );

      const newDubbing = new this.dubbingModel({
        [mediaType === 'audio' ? 'audio_id' : 'video_id']: mediaId,
        el_dubbing_id: dubbing.dubbing_id,
        target_languages: [body.target_lang],
        status: 'pending',
        user_id: media.user_id,
        name: media.name,
      });

      await newDubbing.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'dubbing: New dubbing entry created',
          data: { newDubbing },
        }),
      );

      media.dubbings.push(newDubbing._id as Schema.Types.ObjectId);

      await media.save();

      await this.dubbingQueue.add(
        DUBBING_QUEUE_HANDLER,
        { id: newDubbing._id, requestId: userId, attempt: 1 },
        { delay: MINUTES.ONE },
      );

      await this.userService.addDubbings(
        userId,
        newDubbing._id as Schema.Types.ObjectId,
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'dubbing: Dubbing job added to queue',
          data: { job: { id: newDubbing._id, dubbing_id: dubbing.dubbing_id } },
        }),
      );

      return newDubbing;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'dubbing: Error occurred during dubbing process',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async getDubbedStatus(dubbingId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: 'getDubbedStatus: Fetching dubbing status',
        data: { dubbingId },
      }),
    );
    try {
      const dubbing = await this.dubbingModel.findById(dubbingId);
      if (!dubbing) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'getDubbedStatus: Invalid dubbing id',
            data: { dubbingId },
          }),
        );
        throw new Error('Invalid dubbing id');
      }
      const status = await this.elevenLabsService.getDubStatus(
        dubbing.el_dubbing_id,
      );
      this.loggerService.log(
        JSON.stringify({
          message: 'getDubbedStatus: Fetched dubbing status successfully',
          data: { dubbingId, status },
        }),
      );
      return status;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'getDubbedStatus: Error occurred while fetching dubbing status',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async handleDubFail(dubbingId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: `handleDubFail: Dub failed for ID: ${dubbingId}`,
        data: { dubbingId },
      }),
    );

    if (!mongoose.Types.ObjectId.isValid(dubbingId)) {
      this.loggerService.log(
        JSON.stringify({
          message: 'handleDubFail: Invalid Object ID',
          data: { dubbingId },
        }),
      );

      throw new Error('Invalid Object Id');
    }

    try {
      await this.dubbingModel.findByIdAndUpdate(dubbingId, {
        status: 'failed',
      });
      this.loggerService.log(
        JSON.stringify({
          message: 'handleDubFail: Dub Status updated for ID: ${dubbingId',
          data: { dubbingId },
        }),
      );
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'handleDubFail: Error occurred ',
          error,
        }),
      );
      throw new Error('Error Occured while updating the status');
    }
  }

  async downlaodDubFile(dubbingId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: 'downloadDubFile: Starting download of dubbed file',
        data: { dubbingId },
      }),
    );
    try {
      const dubbing = await this.dubbingModel.findById(dubbingId);
      if (!dubbing) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'downloadDubFile: Invalid dubbing id',
            data: { dubbingId },
          }),
        );
        throw new Error('Invalid dubbing id');
      }
      const language = dubbing.target_languages[0];
      const responseStream = await this.elevenLabsService.downloadDubbedFile(
        dubbing.el_dubbing_id,
        language,
      );
      const fileName = `${dubbingId}_${language}.mp4`;
      const s3FilePath = await this.storageService.uploadStream(
        responseStream,
        fileName,
        'video/mp4',
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'downloadDubFile: File uploaded to S3',
          data: { s3FilePath },
        }),
      );

      dubbing.media_key = s3FilePath;
      dubbing.status = 'completed';
      await dubbing.save();

      this.loggerService.log(
        JSON.stringify({
          message: 'downloadDubFile: Dubbing entry updated with media URL',
          data: { dubbing },
        }),
      );

      return s3FilePath;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'downloadDubFile: Error occurred during file download and upload',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async getDubbings(userId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: 'getDubbings: Retrieving Dubs file from DB',
        data: { userId },
      }),
    );
    try {
      const dubbings = await this.userService.getDubbings(userId);

      this.loggerService.log(
        JSON.stringify({
          message: 'getDubbings: Retrieved Dubs file from DB',
          data: { dubbings },
        }),
      );

      const dubbingsWithUrl = dubbings.map((dub) => ({
        ...dub,
        url: this.storageService.get(dub.media_key),
      }));

      return dubbingsWithUrl;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getDubbings: Error occurred while retrieving dubbings',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async removeDubbing(videoId: string) {
    this.loggerService.log(
      JSON.stringify({
        message: 'removeDubbing: Removing dub from db and EL - Start',
        data: { videoId },
      }),
    );

    try {
      const dubbing = await this.dubbingModel.findById(videoId);

      this.loggerService.log(
        JSON.stringify({
          message: 'removeDubbing: Removing dub EL - Start',
          data: { videoId },
        }),
      );

      await this.elevenLabsService.removeDubbedFile(dubbing.el_dubbing_id);

      this.loggerService.log(
        JSON.stringify({
          message: 'removeDubbing: Removing dub EL - Completed',
          data: { videoId },
        }),
      );

      await this.dubbingModel.findByIdAndDelete(videoId);

      this.loggerService.log(
        JSON.stringify({
          message: 'removeDubbing: Removing dub from db and EL - Completed',
          data: { videoId },
        }),
      );
      return responseGenerator('Deleted');
    } catch (error) {
      console.log({ error });
      this.loggerService.error(
        JSON.stringify({
          message: 'removeDubbing: Error occurred while removing dubs',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  notifyClient(id: string, message: any) {
    this.loggerService.log(
      JSON.stringify({
        message: `notifyClient: Emitting event for id ${id}`,
        data: message,
      }),
    );
    this.eventEmitter.emit(id, message);
  }
}
