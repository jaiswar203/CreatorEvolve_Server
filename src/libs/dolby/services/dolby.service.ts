import { ConfigService } from '@/common/config/services/config.service';
import { HttpService } from '@/common/http/services/http.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { DOLBY_ACCESS_TOKEN } from '../enum';
import { IDolbyContenType, IDolbyEnhanceRequest } from '../enum';
import { HOURS } from '@/common/constants/time';

@Injectable()
export class DolbyService {
  private apiUrl: string;
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private loggerService: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get('DOLBY_MEDIA_URI');
  }

  private async getAccessToken() {
    this.loggerService.log('getAccessToken: Attempting to fetch access token');
    try {
      const token = await this.cacheManager.get(DOLBY_ACCESS_TOKEN);

      if (!token) {
        this.loggerService.log(
          'getAccessToken: Token not found in cache, fetching new token',
        );
        const encodedParams = new URLSearchParams();
        encodedParams.set('grant_type', 'client_credentials');
        encodedParams.set('expires_in', (HOURS.TWENTY_FOUR / 1000).toString());

        this.loggerService.log(
          JSON.stringify({
            message: 'getAccessToken: Encoded param is ready',
            data: encodedParams.toString(),
          }),
        );

        const combinedString = `${this.configService.get('DOLBY_API_KEY')}:${this.configService.get('DOLBY_API_SECRET')}`;
        const base64EncodedString =
          Buffer.from(combinedString).toString('base64');

        const resp = await lastValueFrom(
          this.httpService.post(
            `${this.apiUrl}/v1/auth/token`,
            encodedParams.toString(),
            {
              headers: {
                accept: 'application/json',
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${base64EncodedString}`,
              },
            },
          ),
        ).then((res) => res.data);

        await this.cacheManager.set(
          DOLBY_ACCESS_TOKEN,
          resp.access_token,
          HOURS.TWENTY_FOUR,
        );

        this.loggerService.log(
          JSON.stringify({
            message: 'getAccessToken: New token fetched and cached',
            tokenExpiresIn: '86400 seconds', // Updated to 24 hours in seconds
          }),
        );

        return resp.access_token;
      }
      this.loggerService.log('getAccessToken: Token found in cache');

      return token;
    } catch (error: any) {
      console.log({ error: error.response?.data || error.message });
      this.loggerService.log(
        JSON.stringify({
          message: 'getAccessToken: Error occurred',
          error: error.message,
        }),
      );
      throw new Error(error.message);
    }
  }

  async enhanceAudio({
    input_url,
    output_url,
    content,
    loudness,
    noise,
    dynamics,
    speech,
    music,
  }: IDolbyEnhanceRequest): Promise<any> {
    this.loggerService.log(
      JSON.stringify({
        message: 'enhanceAudio: Starting audio enhancement process',
      }),
    );

    try {
      const payload: any = {
        input: input_url,
        output: output_url,
        audio: {},
      };

      // Specifies the type of audio content (music, voice, or voice-over-music)
      if (content) payload.content = { type: content };

      // Loudness: Adjusts the perceived loudness of the audio to a target level
      if (loudness) payload.audio.loudness = loudness;

      // Dynamics: Adjusts the dynamic range of the audio
      if (dynamics) payload.audio.dynamics = dynamics;

      // Noise: Reduces background noise in the audio
      if (noise) payload.audio.noise = noise;

      if (speech) {
        payload.audio.speech = {};

        // Speech Isolation: Enhances speech by reducing background sounds
        if (speech.isolation) {
          if (speech.isolation.amount < 0 || speech.isolation.amount > 100) {
            throw new Error(
              'Speech isolation amount must be between 0 and 100',
            );
          }
          payload.audio.speech.isolation = speech.isolation;
        }

        // Sibilance: Reduces sharp "s" or "sh" sounds in speech
        if (speech.sibilance) payload.audio.speech.sibilance = speech.sibilance;

        // Click: Reduces mouth clicks and other impulsive sounds in speech
        if (speech.click) payload.audio.speech.click = speech.click;

        // Plosive: Reduces pops from "p" and "b" sounds in speech
        if (speech.plosive) payload.audio.speech.plosive = speech.plosive;
      }

      // Music: Detects the presence of music in the audio
      if (music) payload.audio.music = music;

      this.loggerService.log(
        JSON.stringify({
          message: 'enhanceAudio: Payload prepared',
          payload: payload,
        }),
      );

      const API_TOKEN = await this.getAccessToken();

      const response = await lastValueFrom(
        this.httpService.post(`${this.apiUrl}/media/enhance`, payload, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'enhanceAudio: Enhancement job started',
          jobId: response.data.job_id,
        }),
      );

      return response.data;
    } catch (error: any) {
      console.log(error)
      console.log(error.response.data)
      this.loggerService.log(
        JSON.stringify({
          message: 'enhanceAudio: Error occurred',
          error: error.message,
        }),
      );
      throw new Error(error.message);
    }
  }

  async diagnoseAudio(
    input: string,
    contentType?: IDolbyContenType,
  ): Promise<string> {
    this.loggerService.log(
      JSON.stringify({
        message: 'diagnoseAudio: Starting audio diagnosis process',
        input: input,
      }),
    );

    try {
      const API_TOKEN = await this.getAccessToken();

      this.loggerService.log(
        JSON.stringify({
          message:
            'diagnoseAudio: Access token obtained, sending diagnosis request',
        }),
      );

      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/media/diagnose`,
          { input, type: contentType ?? '' }, // Include the input in the request body
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        JSON.stringify({
          message: 'diagnoseAudio: Diagnosis job started successfully',
          jobId: resp.job_id,
        }),
      );

      return resp.job_id;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: 'diagnoseAudio: Error occurred',
          error: error.message,
          input: input,
        }),
      );

      throw new Error(`Failed to diagnose audio: ${error.message}`);
    }
  }

  async registerWebhook(url: string): Promise<any> {
    const webhookUrl = `${this.configService.get('APP_URL')}/v1/public/dolby-job-status`;

    this.loggerService.log(
      JSON.stringify({
        message: 'registerWebhook: Starting webhook registration process',
        webhookUrl: webhookUrl,
      }),
    );

    try {
      const API_TOKEN = await this.getAccessToken();

      this.loggerService.log(
        JSON.stringify({
          message:
            'registerWebhook: Access token obtained, sending registration request',
        }),
      );

      const resp = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/media/webhooks`,
          {
            callback: {
              url: webhookUrl,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      ).then((res) => res.data);

      this.loggerService.log(
        JSON.stringify({
          message: 'registerWebhook: Webhook registered successfully',
          response: resp,
        }),
      );

      return resp;
    } catch (error: any) {
      this.loggerService.log(
        JSON.stringify({
          message: 'registerWebhook: Error occurred',
          error: error.message,
          webhookUrl: webhookUrl,
        }),
      );

      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }
}
