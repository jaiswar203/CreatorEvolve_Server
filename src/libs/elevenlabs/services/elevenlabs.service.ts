import { ConfigService } from '@/common/config/services/config.service';
import { HttpService } from '@/common/http/services/http.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import { Injectable } from '@nestjs/common';

import { lastValueFrom } from 'rxjs';

import { languageCodes } from '@/common/constants/audio.enum';
import * as FormData from 'form-data';
import { MODEL_ID } from '../enum';
import { AxiosRequestConfig } from 'axios';
import { createReadStream } from 'fs';

interface ElevenLabDubRequest {
  url: string;
  target_lang: string;
  highest_resolution: boolean;
  num_speakers: number;
  start_time: number;
  end_time: number;
  source_lang: string;
}

export interface ElevenLabsDubResponse {
  dubbing_id: string;
  expected_duration: string;
}

export interface ElevenLabsTextToSpeechRequest {
  voice_id: string;
  text: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface InstantVoiceCloneRequest {
  name: string;
  files: string[];
  description: string;
  labels: { [key: string]: string };
}

export interface GenerateRandomVoiceRequest {
  gender: string;
  age: string;
  accent: string;
  accent_strength: number;
  text: string;
}

export interface SaveRandomGeneratedVoiceRequest {
  generated_voice_id: string;
  labels: { [key: string]: string };
  voice_description: string;
  voice_name: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService,
    private httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get('ELEVEN_LABS_BASE_URL');
    this.apiKey = this.configService.get('ELEVEN_LABS_API_KEY');
  }

  async getVoicesList() {
    this.loggerService.log(`getVoicesList: Fetching all voices from the EL`);
    try {
      const voicesResp = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}/voices`, {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }),
      ).then((res) => res.data);

      const transformedList = voicesResp.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        preview: voice.preview_url,
        labels: voice.labels,
      }));

      this.loggerService.log(
        JSON.stringify({
          message: `getVoicesList: Fetched all voices from the EL`,
          data: transformedList,
        }),
      );

      return transformedList;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `getVoicesList: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async getSharedVoicesList() {
    this.loggerService.log(
      `getSharedVoicesList: Fetching all voices from the EL`,
    );
    try {
      const sharedVoicesResp = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}/shared-voices`, {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }),
      ).then((res) => res.data);

      const transformedSharedVoicesList = sharedVoicesResp.voices.map(
        (voice) => ({
          id: voice.voice_id,
          name: voice.name,
          preview: voice.preview_url,
          rate: voice.rate,
          public_owner_id: voice.public_owner_id,
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message: `getSharedVoicesList: Fetched all voices from the EL`,
          data: transformedSharedVoicesList,
        }),
      );

      return transformedSharedVoicesList;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `getSharedVoicesList: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async addSharedVoiceInLibrary(
    public_owner_id: string,
    voice_id: string,
    name: string,
  ) {
    this.loggerService.log(
      `addSharedVoiceInLibrary: Adding voice ${voice_id} to the library for owner ${public_owner_id} with ${name}`,
    );
    try {
      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/voices/add/${public_owner_id}/${voice_id}`,
          { new_name: name },
          {
            headers: {
              'xi-api-key': this.apiKey,
            },
          },
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        JSON.stringify({
          message: `addSharedVoiceInLibrary: Successfully added voice ${voice_id} for owner ${public_owner_id}`,
          data: resp,
        }),
      );

      return resp;
    } catch (error: any) {
      console.log({ error });
      console.log({ error: error.response.data });
      this.loggerService.log(
        JSON.stringify({
          message: `addSharedVoiceInLibrary: Error occurred`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async dubbing({
    url,
    target_lang,
    source_lang = 'auto',
    end_time,
    start_time,
    highest_resolution = true,
    num_speakers = 0,
  }: ElevenLabDubRequest): Promise<ElevenLabsDubResponse> {
    if (!languageCodes.includes(target_lang))
      throw new Error('Invalid Language Code');

    try {
      const formData = new FormData();
      formData.append('source_url', url);
      formData.append('target_lang', target_lang);
      formData.append('mode', 'automatic');
      formData.append(
        'highest_resolution',
        highest_resolution ? 'true' : 'false',
      );
      formData.append('num_speakers', num_speakers.toString());
      formData.append('source_lang', source_lang);
      if (start_time) formData.append('start_time', start_time);
      if (end_time) formData.append('end_time', end_time);

      const resp = await lastValueFrom(
        this.httpService.post(`${this.apiUrl}/dubbing`, formData, {
          headers: {
            'xi-api-key': this.apiKey,
            ...formData.getHeaders(),
          },
        }),
      ).then((res) => res.data);

      return resp;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `dubbing: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async getDubStatus(dubbing_id: string) {
    try {
      const resp = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}/dubbing/${dubbing_id}`, {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }),
      ).then((res) => res.data);
      return resp;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `getVoicesList: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async downloadDubbedFile(dubbing_id: string, language: string) {
    try {
      const resp = await lastValueFrom(
        this.httpService.get(
          `${this.apiUrl}/dubbing/${dubbing_id}/audio/${language}`,
          {
            headers: {
              'xi-api-key': this.apiKey,
            },
            responseType: 'stream',
          },
        ),
      ).then((res) => res.data);

      return resp;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `getVoicesList: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async removeDubbedFile(dubbing_id: string) {
    try {
      await lastValueFrom(
        this.httpService.delete(`${this.apiUrl}/dubbing/${dubbing_id}`, {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }),
      );
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: `removeDubbedFile: Error occured`,
          data: error,
        }),
      );
      throw new Error(error.message);
    }
  }

  async createTextToSpeech(body: ElevenLabsTextToSpeechRequest) {
    const {
      text,
      voice_id,
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
    } = body;

    this.loggerService.log(
      'createTextToSpeech: Starting with provided body',
      JSON.stringify(body),
    );

    try {
      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/text-to-speech/${voice_id}`,
          {
            text,
            model_id: MODEL_ID,
            voice_settings: {
              stability: stability ?? 0.5,
              similarity_boost: similarity_boost ?? 0.75,
              style,
              use_speaker_boost,
            },
          },
          {
            headers: {
              'xi-api-key': this.apiKey,
            },
            responseType: 'stream',
          },
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        'createTextToSpeech: Successfully created text to speech response',
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'createTextToSpeech: Error occurred',
          error: error.message,
          response: error.response?.data,
        }),
      );
      throw new Error(error.message);
    }
  }

  async instantVoiceClone(body: InstantVoiceCloneRequest) {
    this.loggerService.log(
      'instantVoiceClone: Starting Voice cloning with provided body',
      JSON.stringify(body),
    );

    const form = new FormData();
    form.append('name', body.name);
    form.append('description', body.description);
    body.files.forEach((filePath) => {
      form.append('files', createReadStream(filePath));
    });

    form.append('labels', JSON.stringify(body.labels));

    const headers = {
      ...form.getHeaders(),
      'xi-api-key': this.apiKey,
    };

    const config: AxiosRequestConfig = {
      headers: headers,
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post(`${this.apiUrl}/voices/add`, form, config),
      ).then((res) => res.data);

      this.loggerService.log(
        `instantVoiceClone: Successfully completed voice cloning, voice id: ${resp?.voice_id}`,
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'instantVoiceClone: Error occurred',
          error: error.message,
          response: error.response?.data,
        }),
      );
      throw new Error(error.message);
    }
  }

  async getRandomVoiceGenerationParam() {
    const headers = {
      'xi-api-key': this.apiKey,
    };

    const config = {
      headers: headers,
    };

    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'Starting request to fetch voice generation parameters',
        }),
      );

      const resp = await lastValueFrom(
        this.httpService.get(
          `${this.apiUrl}/voice-generation/generate-voice/parameters`,
          config,
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        JSON.stringify({
          message: 'Response received',
          data: resp,
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getRandomVoiceGenerationParam: Error occurred',
          error: error.message,
          response: error.response?.data,
        }),
      );

      throw new Error(error.message);
    }
  }

  async generateRandomVoice(body: GenerateRandomVoiceRequest) {
    try {
      this.loggerService.log('generateRandomVoice: Start of function');
      let voiceId: string;

      this.loggerService.log(
        `generateRandomVoice: Sending request to generate voice with body: ${JSON.stringify(body)}`,
      );
      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/voice-generation/generate-voice`,
          {
            gender: body.gender,
            accent: body.accent,
            accent_strength: body.accent_strength,
            age: body.age,
            text: body.text,
          },
          {
            headers: {
              'xi-api-key': this.apiKey,
            },
            responseType: 'stream',
          },
        ),
      ).then((res) => {
        voiceId = res.headers['generated_voice_id'];
        this.loggerService.log(
          JSON.stringify({
            message: 'generateRandomVoice: Voice generation successful',
            generatedVoiceId: voiceId,
          }),
        );

        this.loggerService.log(
          'generateRandomVoice: Voice generation response received',
        );
        return res.data;
      });

      this.loggerService.log('generateRandomVoice: End of function');
      return { id: voiceId, data: resp };
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async saveRandomGeneratedVoice(body: SaveRandomGeneratedVoiceRequest) {
    this.loggerService.log(
      JSON.stringify({
        message: 'saveRandomGeneratedVoice: Start of function',
      }),
    );

    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Sending request to create voice',
          data: body,
        }),
      );

      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/voice-generation/create-voice`,
          body,
          {
            headers: {
              'xi-api-key': this.apiKey,
            },
          },
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        JSON.stringify({
          message:
            'saveRandomGeneratedVoice: Received response from create voice',
          data: resp,
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: End of function',
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'saveRandomGeneratedVoice: Error occurred',
          error: error.message,
          response: error.response?.data,
        }),
      );
      throw new Error(error.message);
    }
  }
}
