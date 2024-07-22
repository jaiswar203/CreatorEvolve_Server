import { ConfigService } from '@/common/config/services/config.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import OpenAI from 'openai';
import { TranscriptionCreateParams } from 'openai/resources/audio/transcriptions';

export enum CHAT_COMPLETION_RESPONSE_FORMAT {
  TEXT = 'text',
  JSON_OBJECT = 'json_object',
}

export enum TRANSCRIPTION_RESPONSE_FORMAT {
  SRT = 'srt',
  JSON = 'json',
  TEXT = 'text',
  VTT = 'vtt',
  VERBOSE_JSON = 'verbose_json',
}

@Injectable()
export class OpenAIService {
  private client: OpenAI;
  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPEN_AI_API_KEY'),
    });
  }

  async chatCompletion({
    prompt,
    responseFormat = CHAT_COMPLETION_RESPONSE_FORMAT.TEXT,
    model,
    temperature = 0.7,
    maxTokens,
  }: {
    prompt: string;
    responseFormat?: CHAT_COMPLETION_RESPONSE_FORMAT;
    temperature?: number;
    model?: string;
    maxTokens?: number;
  }) {
    try {
      this.loggerService.log(
        `chatCompletion: Generating Response for prompt: ${prompt}  `,
      );
      const response = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model ?? 'gpt-4o',
        response_format: { type: responseFormat },
        temperature,
        max_tokens: maxTokens,
      });

      this.loggerService.log(
        `chatCompletion: Generated Response for prompt: ${response.choices[0].message.content} ,Total Token usage: ${response.usage.total_tokens} `,
      );
      return response.choices[0].message.content;
    } catch (error: any) {
      // throw new Error(JSON.stringify(error));
    }
  }

  async transcribe({
    filePath,
    response_format = TRANSCRIPTION_RESPONSE_FORMAT.TEXT,
    timestamp_granularities,
  }: {
    filePath: string;
    response_format: TRANSCRIPTION_RESPONSE_FORMAT;
    timestamp_granularities: 'word' | 'segment';
  }) {
    try {
      if (!filePath) {
        throw new Error('File path must be provided.');
      }

      this.loggerService.log(
        `transcribe: Starting transcription for file: ${filePath}`,
      );

      const fileBuffer = createReadStream(filePath);

      const option: TranscriptionCreateParams = {
        file: fileBuffer,
        model: 'whisper-1',
        response_format,
        timestamp_granularities: [timestamp_granularities],
      };

      if (
        response_format !== TRANSCRIPTION_RESPONSE_FORMAT.VERBOSE_JSON &&
        timestamp_granularities
      ) {
        // timestamp_granularities only supported on verbose_json response
        delete option.timestamp_granularities;
      }

      const response = await this.client.audio.transcriptions.create(option);

      this.loggerService.log({
        message: `transcribeVideo: Transcription result: ${response}  `,
        data: response,
      });

      return response;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: `transcribe: Error Occured`,
          error,
        }),
      );

      throw new Error(error.message);
    }
  }
}
