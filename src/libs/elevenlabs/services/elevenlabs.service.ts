import { ConfigService } from '@/common/config/services/config.service';
import { HttpService } from '@/common/http/services/http.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import { Injectable } from '@nestjs/common';

import { lastValueFrom } from 'rxjs';

import { languageCodes } from '@/common/constants/audio.enum';
import * as FormData from 'form-data';

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

  async createAudioFileFromText(text: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        // const audio = await this.client.generate({
        //   voice: 'Rachel',
        //   model_id: 'eleven_turbo_v2',
        //   text,
        // });
        // const fileName = `${uuid()}.mp3`;
        // const fileStream = createWriteStream(fileName);
        // audio.pipe(fileStream);
        // fileStream.on('finish', () => resolve(fileName)); // Resolve with the fileName
        // fileStream.on('error', reject);
        resolve('');
      } catch (error) {
        reject(error);
      }
    });
  }

  async getVoicesList() {
    this.loggerService.log(`getVoicesList: Fetching all voices from the EL`);
    try {
      const resp = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}/voices`, {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }),
      ).then((res) => res.data);

      const transformedList = resp.map((voice) => ({
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
            ...formData.getHeaders(), // Important to include form-data headers
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
}
