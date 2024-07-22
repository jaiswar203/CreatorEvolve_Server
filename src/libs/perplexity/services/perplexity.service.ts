import { ConfigService } from '@/common/config/services/config.service';
import { HttpService } from '@/common/http/services/http.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import { IChatMessage } from '@/db/schemas/research/chat.schema';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { Transform } from 'stream';

@Injectable()
export class PerplexityService {
  private apiUrl: string;
  private apiKey: string;
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private loggerService: LoggerService,
  ) {
    this.apiUrl = this.configService.get('PERPLEXITY_API_URL');
    this.apiKey = this.configService.get('PERPLEXITY_API_KEY');
  }

  async chatCompletion({
    messages,
    model,
    stream,
    temperature,
  }: {
    messages: IChatMessage[];
    temperature?: number;
    model?: string;
    stream?: boolean;
  }) {
    try {
      this.loggerService.log(
        `chatCompletion: Generating Response for messages: ${JSON.stringify(messages)}`,
      );

      const transformStream = new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk);
          callback();
        },
      });

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.apiUrl}/chat/completions`,
          {
            messages,
            temperature: temperature ?? 0.2,
            return_images: true,
            return_citations: true,
            model: model || this.configService.get('PERPLEXITY_DEFAULT_MODEL'),
            stream: !!stream,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            responseType: 'stream',
          },
        ),
      );

      response.data.pipe(transformStream);

      this.loggerService.log('Resonse generated');

      return transformStream;
    } catch (error: any) {
      this.loggerService.error(
        `chatCompletion: Error generating response for messages: ${JSON.stringify(messages)} - Error: ${JSON.stringify(error)}`,
      );
      throw new Error(JSON.stringify(error));
    }
  }
}
