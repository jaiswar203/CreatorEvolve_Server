import { StorageService } from '@/common/storage/services/storage.service';
import { Video, VideoDocument } from '@/db/schemas/media/video.schema';
import { ElevenLabsService } from '@/libs/elevenlabs/services/elevenlabs.service';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, Schema } from 'mongoose';
import { DubRequestDto } from '../dto/dub.request.dto';
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
import { Audio, AudioDocument } from '@/db/schemas/media/audio.schema';
import { readFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { VIDEO_TYPES } from '@/common/constants/video.enum';
import { TextToSpeechDTO } from '../dto/text-to-speech.dto';
import { v4 as uuid } from 'uuid';
import { EL_VOICE_TYPE, Voice } from '@/db/schemas/media/voice.schema';
import { InstantVoiceCloneDto } from '../dto/instant-clone.dto';
import { GenerateVoiceDto } from '../dto/random-voice.dto';
import { SaveRandomGeneratedVoiceDto } from '../dto/save-random-voice.dto';
import { MailService } from '@/common/mail/services/mail.service';
import { Inquiry, InquiryTypes } from '@/db/schemas/inquiries/inquiry.schema';
import { ProfessionalVoiceCloneInquiryDto } from '../dto/professiona-voice-clone-inqury.dto';
import { DolbyService } from '@/libs/dolby/services/dolby.service';
import { EnhanceAudioDto } from '../dto/enhance-audio.dto';
import { AudioEnhance } from '@/db/schemas/media/enhance-audio.schema';
import { IDolbyContenType } from '@/libs/dolby/enum';
import {
  AudioAnalyze,
  IAudioAnalyzeDiagnosis,
  IAudioAnalyzeMediaType,
} from '@/db/schemas/media/analyze-audio.schema';
import {
  CHAT_COMPLETION_RESPONSE_FORMAT,
  OpenAIService,
} from '@/libs/openai/services/openai.service';
import {
  generateDetailedInfoOnLoudness,
  generateIdealLoudnessObjectForPlatform,
  generateSummaryForDiagnosedResultOfTheAudio,
} from '@/common/prompt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AudioService {
  constructor(
    private elevenLabsService: ElevenLabsService,
    private storageService: StorageService,
    private loggerService: LoggerService,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
    private mailService: MailService,
    private dolbyService: DolbyService,
    private openAIService: OpenAIService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Video.name) private videoModel: Model<Video>,
    @InjectModel(Audio.name) private audioModel: Model<Audio>,
    @InjectModel(AudioEnhance.name)
    private audioEnhanceModel: Model<AudioEnhance>,
    @InjectModel(AudioAnalyze.name)
    private audioAnalyzeModel: Model<AudioAnalyze>,
    @InjectModel(Dubbing.name) private dubbingModel: Model<Dubbing>,
    @InjectModel(Voice.name) private voiceModel: Model<Voice>,
    @InjectModel(Inquiry.name) private inquiryModel: Model<Inquiry>,
    @InjectQueue(DUBBING_QUEUE) private dubbingQueue: Queue,
  ) {}

  async getVoicesList(userId) {
    this.loggerService.log(
      JSON.stringify({ message: 'getVoicesList: Fetching voices list' }),
    );

    try {
      const voices = await this.elevenLabsService.getVoicesList();

      const userGeneratedVoice = await this.voiceModel
        .find({ user_id: userId })
        .lean();

      const voicesids = new Set(
        userGeneratedVoice.map((voice) => voice.el_voice_id),
      );

      const { privateVoices, publicVoices } = voices.reduce(
        (result, voice) => {
          if (voicesids.has(voice.id)) {
            result.privateVoices.push(voice);
          } else {
            result.publicVoices.push(voice);
          }
          return result;
        },
        { privateVoices: [], publicVoices: [] },
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'getVoicesList: Voices list fetched successfully',
          data: { privateVoices, publicVoices },
        }),
      );

      return { private: privateVoices, public: publicVoices };
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

  async getSharedVoicesList() {
    this.loggerService.log(
      JSON.stringify({ message: 'getSharedVoicesList: Fetching voices list' }),
    );
    try {
      const voices = await this.elevenLabsService.getSharedVoicesList();
      this.loggerService.log(
        JSON.stringify({
          message: 'getSharedVoicesList: Voices list fetched successfully',
          data: voices,
        }),
      );
      return voices;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getSharedVoicesList: Failed to fetch voices list',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async addSharedVoiceInLibrary(
    public_owner_id: string,
    voice_id: string,
    name: string,
  ) {
    this.loggerService.log(
      `addSharedVoiceInLibrary: Adding voice ${voice_id} for public owner ${public_owner_id}`,
    );
    try {
      const resp = await this.elevenLabsService.addSharedVoiceInLibrary(
        public_owner_id,
        voice_id,
        name,
      );

      this.loggerService.log(
        JSON.stringify({
          message: `addSharedVoiceInLibrary: Successfully added voice ${voice_id} for public owner ${public_owner_id}`,
          data: resp,
        }),
      );

      return resp;
    } catch (error) {
      console.log({ error });
      this.loggerService.error(
        JSON.stringify({
          message: 'addSharedVoiceInLibrary: Error occurred',
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
      const audioWithPresignedUrl = audios.map((audio) => {
        const preSignedVideoUrl = this.storageService.get(audio.url);

        return {
          ...audio,
          url: preSignedVideoUrl,
        };
      });
      return audioWithPresignedUrl;
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
        type: VIDEO_TYPES.FILE_UPLOAD,
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

  async textToSpeech(userId: string, body: TextToSpeechDTO) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: `textToSpeech: Starting text to speech conversion for user ${userId}`,
          data: body,
        }),
      );

      const responseStream =
        await this.elevenLabsService.createTextToSpeech(body);
      this.loggerService.log(
        'textToSpeech: Successfully created text to speech stream',
      );

      const fileName = `${userId}-${uuid()}.mp3`;
      this.loggerService.log(`textToSpeech: Generated file name ${fileName}`);

      const s3FilePath = await this.storageService.uploadStream(
        responseStream,
        fileName,
        'audio/mp3',
      );
      this.loggerService.log(
        `textToSpeech: Successfully uploaded file to S3 at path ${s3FilePath}`,
      );

      const preSignedUrl = this.storageService.get(s3FilePath);

      return preSignedUrl;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'textToSpeech: Error occurred during text to speech conversion',
          error: error.message,
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

      const ID = dubbing.audio_id ?? dubbing.video_id;

      if (dubbing.audio_id) {
        const audioModel = this.audioModel as Model<Audio>;
        await audioModel.findByIdAndUpdate(ID, {
          $pull: { dubbings: dubbing._id },
        });
      } else if (dubbing.video_id) {
        const videoModel = this.videoModel as Model<Video>;
        await videoModel.findByIdAndUpdate(ID, {
          $pull: { dubbings: dubbing._id },
        });
      }

      this.loggerService.log(
        JSON.stringify({
          message: 'removeDubbing: Removing dub from db and EL - Completed',
          data: { videoId },
        }),
      );
      return responseGenerator('Deleted');
    } catch (error) {
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

  async instantCloneVoice(userId: string, body: InstantVoiceCloneDto) {
    const { labels, name, description, files } = body;
    this.loggerService.log(
      JSON.stringify({
        message: 'instantCloneVoice: Starting voice cloning process',
        userId,
        requestData: body,
      }),
    );

    let tempFilePaths: string[] = [];
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'instantCloneVoice: Transforming labels array to object',
        }),
      );

      const labelObj = {};
      labels.forEach((label) => {
        labelObj[label.key] = label.value;
      });

      this.loggerService.log(
        JSON.stringify({
          message:
            'instantCloneVoice: Calling ElevenLabs service to clone voice',
          data: { name, description, files, labels: labelObj },
        }),
      );

      // Download files from S3 and save them temporarily
      this.loggerService.log(
        JSON.stringify({
          message: 'instantCloneVoice: Downloading files from S3',
          files,
        }),
      );

      for (const s3Key of files) {
        const fileUrl = this.storageService.get(s3Key);
        const tempFilePath =
          await this.storageService.downloadFileFromUrl(fileUrl);
        tempFilePaths.push(tempFilePath);
      }

      this.loggerService.log(
        JSON.stringify({
          message:
            'instantCloneVoice: Calling ElevenLabs service to clone voice',
          data: { name, description, files: tempFilePaths, labels: labelObj },
        }),
      );

      const resp = await this.elevenLabsService.instantVoiceClone({
        name,
        files: tempFilePaths,
        description,
        labels: labelObj,
      });

      this.loggerService.log(
        JSON.stringify({
          message:
            'instantCloneVoice: Voice cloned successfully from ElevenLabs',
          response: resp,
        }),
      );

      const voice = new this.voiceModel({
        name,
        description,
        labels: labelObj,
        files,
        el_voice_id: resp?.voice_id,
        el_voice_type: EL_VOICE_TYPE.INSTANT,
        user_id: userId,
      });

      this.loggerService.log(
        JSON.stringify({
          message: 'instantCloneVoice: Saving voice data to database',
          voice,
        }),
      );

      await voice.save();

      this.loggerService.log(
        JSON.stringify({
          message: 'instantCloneVoice: Adding voice to user profile',
          userId,
          voiceId: voice.id,
        }),
      );

      await this.userService.addVoice(userId, voice._id as ObjectId);

      this.loggerService.log(
        JSON.stringify({
          message:
            'instantCloneVoice: Voice cloning process completed successfully',
          userId,
          voiceId: voice.id,
        }),
      );

      return voice;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'instantCloneVoice: Error occurred during voice cloning process',
          error: error?.message,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    } finally {
      // Clean up temporary files
      this.loggerService.log(
        JSON.stringify({
          message: 'instantCloneVoice: Cleaning up temporary files',
          tempFilePaths,
        }),
      );

      for (const filePath of tempFilePaths) {
        await unlink(filePath);
      }
    }
  }

  async getRandonVoiceGenerationParams() {
    try {
      const resp = await this.elevenLabsService.getRandomVoiceGenerationParam();

      return resp;
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'getRandonVoiceGenerationParams: Error occurred while removing dubs',
          error,
        }),
      );
      throw new HttpException('Server failed', HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async generateRandomVoice(userId: string, body: GenerateVoiceDto) {
    try {
      this.loggerService.log('generateRandomVoice: Start of function');

      this.loggerService.log(
        `generateRandomVoice: Calling generateRandomVoice with body: ${JSON.stringify(body)}`,
      );
      const response = await this.elevenLabsService.generateRandomVoice(body);
      this.loggerService.log(
        'generateRandomVoice: Successfully created text to speech stream',
      );

      const fileName = `${userId}-${uuid()}.mp3`;
      this.loggerService.log(
        `generateRandomVoice: Generated file name ${fileName}`,
      );

      this.loggerService.log(`generateRandomVoice: Uploading file to S3`);
      const s3FilePath = await this.storageService.uploadStream(
        response.data,
        fileName,
        'audio/mp3',
      );
      this.loggerService.log(
        `generateRandomVoice: Successfully uploaded file to S3 at path ${s3FilePath}`,
      );

      this.loggerService.log('generateRandomVoice: End of function');

      const preSignedUrl = this.storageService.get(s3FilePath);
      return { preview: preSignedUrl, voice_id: response.id };
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'generateRandomVoice: Error occurred while generating random voice',
          error,
        }),
      );
      throw new HttpException(
        error.message ?? ' Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async saveRandomGeneratedVoice(
    userId: string,
    body: SaveRandomGeneratedVoiceDto,
  ) {
    this.loggerService.log(
      JSON.stringify({
        message: 'saveRandomGeneratedVoice: Start of function',
      }),
    );

    const { labels } = body;
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Processing labels',
          data: labels,
        }),
      );

      const labelObj = {};
      labels.forEach((label) => {
        labelObj[label.key] = label.value;
      });

      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Transformed labels object',
          data: labelObj,
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message:
            'saveRandomGeneratedVoice: Sending request to elevenLabsService',
        }),
      );
      const resp = await this.elevenLabsService.saveRandomGeneratedVoice({
        ...body,
        labels: labelObj,
      });

      this.loggerService.log(
        JSON.stringify({
          message:
            'saveRandomGeneratedVoice: Received response from elevenLabsService',
          data: resp,
        }),
      );

      const fileKey = this.storageService.extractFileNameFromS3Url(
        body.preview_url,
      );

      const voice = new this.voiceModel({
        name: body.voice_name,
        description: body.voice_description,
        labels: labelObj,
        files: [fileKey],
        el_voice_id: resp?.voice_id,
        el_voice_type: EL_VOICE_TYPE.GENERATED,
        user_id: userId,
      });

      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Saving new voice model',
        }),
      );
      await voice.save();

      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Adding voice to user',
        }),
      );
      await this.userService.addVoice(userId, voice._id as ObjectId);

      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: End of function',
        }),
      );
      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message:
            'saveRandomGeneratedVoice: Error occurred while saving random generated voice',
          error: error.message,
        }),
      );

      this.loggerService.error(
        JSON.stringify({
          message: 'Detailed error',
          error: error.stack,
        }),
      );

      throw new HttpException(
        error.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async professionalVoiceCloning(
    userId: string,
    body: ProfessionalVoiceCloneInquiryDto,
  ) {
    const { email, name } = body;
    try {
      const inqury = new this.inquiryModel({
        user_id: userId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: `Inquiry for Professional Voice Clone Service by ${body.email}`,
        type: InquiryTypes.PROFESSIONAL_VOICE_CLONE,
      });
      await inqury.save();

      await this.mailService.sendInquiry({
        email,
        name,
        subject: 'Your Inquiry Has Been Received - CreatorEvolve',
        type: InquiryTypes.PROFESSIONAL_VOICE_CLONE,
      });

      return 'Success';
    } catch (error: any) {
      throw new HttpException(
        error.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async enhanceAudio(
    userId: string,
    mediaId: string,
    mediaType: string,
    body: EnhanceAudioDto,
  ) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Enhancing audio',
          data: { userId, mediaId, mediaType },
        }),
      );
      let media: any;

      if (mediaType === 'audio') {
        media = await this.audioModel.findById(mediaId);
      } else {
        media = await this.videoModel.findById(mediaId);
      }

      if (!media) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'enhanceAudio: No video or Audio found',
            data: { mediaId },
          }),
        );
        throw new HttpException('No Media found', HttpStatus.NOT_FOUND);
      }

      this.loggerService.log(
        JSON.stringify({
          message: 'Media found',
          data: { media },
        }),
      );

      let url: string;

      if (media?.type === VIDEO_TYPES.YOUTUBE) url = media.url;
      else url = this.storageService.get(media.url);

      this.loggerService.log(
        JSON.stringify({
          message: 'URL for enhancement',
          data: { url },
        }),
      );

      const fileName = `${userId}-${uuid()}${extname(media.url)}`;

      const output_url = await this.storageService.generateUploadUrl(fileName);

      this.loggerService.log(
        JSON.stringify({
          message: 'Generated output URL',
          data: { output_url, fileName },
        }),
      );

      const resp = await this.dolbyService.enhanceAudio({
        ...body,
        input_url: url,
        output_url,
      });

      this.loggerService.log(
        JSON.stringify({
          message: 'Dolby service response',
          data: { resp },
        }),
      );

      const enhancement = new this.audioEnhanceModel({
        url: fileName,
        dolby_job_id: resp.job_id,
        [mediaType === 'audio' ? 'audio_id' : 'video_id']: mediaId,
        settings: body,
        user_id: userId,
      });

      await enhancement.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'Enhancement saved',
          data: { enhancement },
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in enhanceAudio',
          data: { error: error.message },
        }),
      );
      throw new HttpException(
        error.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async getEnhancedAudioList(userId: string) {
    try {
      const list = await this.audioEnhanceModel
        .find({ user_id: userId })
        .populate<{ audio_id: AudioDocument }>('audio_id', 'name')
        .populate<{ video_id: VideoDocument }>('video_id', 'name')

        .sort({ _id: -1 })
        .lean();

      const enhancedList = list.map((item) => ({
        id: item._id,
        name: item.audio_id?.name || item.video_id?.name || 'Unnamed',
        status: item.dolby_job_status,
        settings: item.settings,
        url: this.storageService.get(item.url),
        created_at: item.created_at,
      }));

      return { count: enhancedList.length, data: enhancedList };
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in getEnhancedAudioList',
          data: { error: error.message },
        }),
      );
      throw new HttpException(
        error?.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async getDiagnosedAudioList(userId: string) {
    try {
      const audioList = await this.audioAnalyzeModel
        .find({ user_id: userId })
        .populate<{ audio_id: AudioDocument }>('audio_id', 'name _id')
        .populate<{ video_id: VideoDocument }>('video_id', 'name _id')
        .sort({ _id: -1 })
        .lean();

      console.log(audioList);
      const diagnosedAudioList = audioList.map((item) => ({
        id: item._id,
        name: item.audio_id?.name || item.video_id?.name || 'Unnamed',
        media_id: item.audio_id?._id || item?.video_id?._id,
        media_type: item.audio_id?._id ? 'audio' : 'video',
        status: item.dolby_job_status,
        created_at: item.created_at,
        diagnosis: item.diagnosis,
        summary: item.summary,
        media_info: item.media_info,
      }));

      this.loggerService.log(
        JSON.stringify({
          message: 'Successfully fetched diagnosed audio list',
          data: { userId, count: diagnosedAudioList.length },
        }),
      );

      return { count: diagnosedAudioList.length, data: diagnosedAudioList };
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in getDiagnosedAudioList',
          data: { error: error.message },
        }),
      );
      throw new HttpException(
        error?.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async enhanceAudioWithDiagnose(
    userId: string,
    mediaId: string,
    mediaType: string,
    platform: string,
    loudness: object,
  ) {
    const functionName = 'enhanceAudioWithDiagnose';
    try {
      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Enhancing audio ---------`,
          data: { userId, mediaId, mediaType },
        }),
      );
      let media: any;

      if (mediaType === 'audio') {
        media = await this.audioModel.findById(mediaId);
      } else {
        media = await this.videoModel.findById(mediaId);
      }

      if (!media) {
        this.loggerService.warn(
          JSON.stringify({
            message: `${functionName}: --------- No video or Audio found ---------`,
            data: { mediaId },
          }),
        );
        throw new HttpException('No Media found', HttpStatus.NOT_FOUND);
      }

      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Media found ---------`,
          data: { media },
        }),
      );

      let url: string;

      if (media?.type === VIDEO_TYPES.YOUTUBE) url = media.url;
      else url = this.storageService.get(media.url);

      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- URL for enhancement ---------`,
          data: { url },
        }),
      );

      const fileName = `${userId}-${uuid()}${extname(media.url)}`;

      const output_url = await this.storageService.generateUploadUrl(fileName);

      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Generated output URL ---------`,
          data: { output_url, fileName },
        }),
      );

      const prompt = generateIdealLoudnessObjectForPlatform(loudness, platform);

      const generatedLoudnessObject = await this.openAIService.chatCompletion({
        prompt,
        response_format: CHAT_COMPLETION_RESPONSE_FORMAT.JSON_OBJECT,
      });

      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Generated resp ---------`,
          data: generatedLoudnessObject,
        }),
      );

      const parsedResp = JSON.parse(generatedLoudnessObject);

      const body = {
        loudness: {
          ...parsedResp?.loudness,
          enable: true,
          dialog_intelligence: true,
        },
      };

      const resp = await this.dolbyService.enhanceAudio({
        ...body,
        input_url: url,
        output_url,
      });

      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Dolby service response ---------`,
          data: { resp },
        }),
      );

      const enhancement = new this.audioEnhanceModel({
        url: fileName,
        dolby_job_id: resp.job_id,
        [mediaType === 'audio' ? 'audio_id' : 'video_id']: mediaId,
        settings: body,
        user_id: userId,
      });

      await enhancement.save();
      this.loggerService.log(
        JSON.stringify({
          message: `${functionName}: --------- Enhancement saved ---------`,
          data: { enhancement },
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: `${functionName}: --------- Error in enhanceAudio ---------`,
          data: { error: error.message },
        }),
      );
      throw new HttpException(
        error.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async removeEnhancedAudio(enhanceId: string) {
    try {
      const enhanceDoc = await this.audioEnhanceModel.findById(enhanceId);

      if (!enhanceDoc) {
        throw new HttpException(
          'Enhancement document not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const ID = enhanceDoc.audio_id ?? enhanceDoc.video_id;

      if (enhanceDoc.audio_id) {
        const audioModel = this.audioModel as Model<Audio>;
        await audioModel.findByIdAndUpdate(ID, {
          $pull: { enhancments: enhanceDoc._id },
        });
      } else if (enhanceDoc.video_id) {
        const videoModel = this.videoModel as Model<Video>;
        await videoModel.findByIdAndUpdate(ID, {
          $pull: { audio_enhancments: enhanceDoc._id },
        });
      }

      await this.audioEnhanceModel.findByIdAndDelete(enhanceId);

      this.loggerService.log(
        `Enhanced audio with ID ${enhanceId} successfully removed`,
      );

      return 'Success';
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Server failed';
      this.loggerService.error({
        message: 'Error in removeEnhacedAudio',
        error: errorMessage,
        stack: error.stack,
      });

      throw new HttpException(errorMessage, HttpStatus.BAD_GATEWAY, {
        cause: error,
      });
    }
  }

  async dignoseAudio(
    userId: string,
    mediaId: string,
    mediaType: string,
    contentType?: IDolbyContenType,
  ) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Diagnosing audio',
          data: { userId, mediaId, mediaType, contentType },
        }),
      );
      let media: any;

      if (mediaType === 'audio') {
        media = await this.audioModel.findById(mediaId);
      } else {
        media = await this.videoModel.findById(mediaId);
      }

      if (!media) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'dignoseAudio: No video or Audio found',
            data: { mediaId },
          }),
        );
        throw new HttpException('No Media found', HttpStatus.NOT_FOUND);
      }

      this.loggerService.log(
        JSON.stringify({
          message: 'Media found',
          data: { media },
        }),
      );

      let url: string;

      if (media?.type === VIDEO_TYPES.YOUTUBE) url = media.url;
      else url = this.storageService.get(media.url);

      this.loggerService.log(
        JSON.stringify({
          message: 'URL for diagnosis',
          data: { url },
        }),
      );

      const job_id = await this.dolbyService.diagnoseAudio(url, contentType);

      this.loggerService.log(
        JSON.stringify({
          message: 'Dolby diagnosis job_id',
          data: { job_id },
        }),
      );

      const analysis = new this.audioAnalyzeModel({
        dolby_job_id: job_id,
        user_id: userId,
        [mediaType === 'video' ? 'video_id' : 'audio_id']: mediaId,
      });

      await analysis.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'Analysis saved',
          data: { analysis },
        }),
      );

      return analysis;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in dignoseAudio',
          data: { error: error.message },
        }),
      );
      throw new HttpException(
        error.message ?? 'Server failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
    }
  }

  async saveDiagnoseResult(
    dolbyJobId: string,
    dolbyJobStatus: string,
    diagnosis?: IAudioAnalyzeDiagnosis,
    media_info?: IAudioAnalyzeMediaType,
  ) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Saving diagnosis result',
          data: { dolbyJobId, dolbyJobStatus },
        }),
      );
      const document = await this.audioAnalyzeModel.findOne({
        dolby_job_id: dolbyJobId,
      });
      if (!document) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'Dolby analyzed document not found',
            data: { dolbyJobId },
          }),
        );
        throw Error('Dolby analyzed document not found');
      }
      const status = dolbyJobStatus === 'Success' ? 'success' : 'failed';
      document.dolby_job_status = status;

      if (dolbyJobStatus === 'Success') {
        document.diagnosis = diagnosis;
        document.media_info = media_info;

        const prompt = generateSummaryForDiagnosedResultOfTheAudio(diagnosis);

        const resp = await this.openAIService.chatCompletion({
          prompt,
          response_format: CHAT_COMPLETION_RESPONSE_FORMAT.JSON_OBJECT,
        });

        const parsedResponse = JSON.parse(resp);

        document.summary = parsedResponse.summary;
      }

      this.notifyClient(document.user_id.toString(), { status });

      await document.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'Diagnosis result saved',
          data: { document },
        }),
      );

      return 'Success';
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in saveDiagnoseResult',
          data: { error },
        }),
      );
      throw new Error(
        JSON.stringify({
          message: 'Error Occurred',
          error,
        }),
      );
    }
  }

  async saveEnhanceResult(dolbyJobId: string, dolbyJobStatus: string) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Saving enhance result',
          data: { dolbyJobId, dolbyJobStatus },
        }),
      );
      const enhanceDoc = await this.audioEnhanceModel.findOne({
        dolby_job_id: dolbyJobId,
      });

      if (!enhanceDoc) {
        this.loggerService.warn(
          JSON.stringify({
            message: 'Dolby analyzed document not found',
            data: { dolbyJobId },
          }),
        );
        throw Error('Dolby analyzed document not found');
      }

      const status = dolbyJobStatus === 'Success' ? 'success' : 'failed';
      enhanceDoc.dolby_job_status = status;

      await enhanceDoc.save();

      this.notifyClient(enhanceDoc.user_id.toString(), { status });

      this.loggerService.log(
        JSON.stringify({
          message: 'Enhance result saved',
          data: { enhanceDoc },
        }),
      );

      return 'Success';
    } catch (error) {
      this.loggerService.error(
        JSON.stringify({
          message: 'Error in saveEnhanceResult',
          data: { error },
        }),
      );
      throw new Error(
        JSON.stringify({
          message: 'Error Occurred',
          error,
        }),
      );
    }
  }

  async generateDetailedInfoOnLoudness(analyzeId: string, platform: string) {
    this.loggerService.log(
      JSON.stringify({
        message: `generateDetailedInfoOnLoudness: Starting function for analyzeId: ${analyzeId} and platform: ${platform}`,
        data: { analyzeId, platform },
      }),
    );

    try {
      const cacheKey = `${analyzeId}-${platform}`;
      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Generated cacheKey`,
          data: { cacheKey },
        }),
      );

      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        this.loggerService.log(
          JSON.stringify({
            message: `generateDetailedInfoOnLoudness: Cache hit`,
            data: { cacheKey, cachedData },
          }),
        );
        return cachedData;
      }

      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Cache miss. Fetching data from database`,
          data: { cacheKey },
        }),
      );

      const analyzeDoc = await this.audioAnalyzeModel.findById(analyzeId);
      if (!analyzeDoc) {
        this.loggerService.error(
          JSON.stringify({
            message: `generateDetailedInfoOnLoudness: No diagnosis found`,
            data: { analyzeId },
          }),
        );
        throw new HttpException(
          'No diagnosis found with this ID',
          HttpStatus.NOT_FOUND,
        );
      }

      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Fetched analyze document`,
          data: { analyzeDoc },
        }),
      );

      const prompt = generateDetailedInfoOnLoudness(
        analyzeDoc.diagnosis.loudness,
        platform,
      );
      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Generated prompt for OpenAI Service`,
          data: { prompt },
        }),
      );

      const resp = await this.openAIService.chatCompletion({ prompt });
      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Received response from OpenAI Service`,
          data: { resp },
        }),
      );

      await this.cacheManager.set(cacheKey, resp, MINUTES.FIVE);
      this.loggerService.log(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Cached response`,
          data: { cacheKey, resp, duration: MINUTES.FIVE },
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: `generateDetailedInfoOnLoudness: Error encountered`,
          data: { error },
        }),
      );
      throw new HttpException(
        error?.message ?? 'Server Failed',
        HttpStatus.BAD_GATEWAY,
        {
          cause: error,
        },
      );
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
