import { LoggerService } from '@/common/logger/services/logger.service';
import {
  IChatMessage,
  IChatRoles,
  ResearchChat,
} from '@/db/schemas/research/chat.schema';
import {
  Research,
  ResearchDocument,
} from '@/db/schemas/research/research.schema';
import { PerplexityService } from '@/libs/perplexity/services/perplexity.service';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
import { UserService } from '@/modules/user/services/user.service';
import { Response } from 'express';
import { ConfigService } from '@/common/config/services/config.service';
import { SoftDeleteModel } from 'mongoose-delete';

import { customsearch } from 'googleapis/build/src/apis/customsearch';
import { youtube } from 'googleapis/build/src/apis/youtube';

import {
  CHAT_COMPLETION_RESPONSE_FORMAT,
  OpenAIService,
} from '@/libs/openai/services/openai.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HOURS } from '@/common/constants/time';
import puppeteer from 'puppeteer';
import { UpdateDocumentDTO } from '../dto/update-document.dto';

@Injectable()
export class ResearchService {
  constructor(
    private perplexityService: PerplexityService,
    private loggerService: LoggerService,
    private userService: UserService,
    private configService: ConfigService,
    private openAIService: OpenAIService,
    @InjectModel(Research.name)
    private researchModel: SoftDeleteModel<ResearchDocument>,
    @InjectModel(ResearchChat.name)
    private researchChatModel: SoftDeleteModel<ResearchChat>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async researchChat(prompt: string, chatId: string, res: Response) {
    this.loggerService.log(`Generating research chat with prompt: ${prompt}`);

    try {
      const researchDoc = await this.researchChatModel.findById(chatId);
      if (!researchDoc) {
        throw new HttpException(
          'Research Doc not found with this ID',
          HttpStatus.NOT_FOUND,
        );
      }

      const researchMessages = researchDoc.messages
        .slice(-10)
        .map((message) => ({ role: message.role, content: message.content }));

      const messages = [
        {
          role: researchDoc.messages[0].role,
          content: researchDoc.messages[0].content,
        },
        ...researchMessages,
        { role: IChatRoles.USER, content: prompt },
      ];

      this.loggerService.log(
        `Sending messages to chatCompletion: ${JSON.stringify(messages)}`,
      );

      const responseStream = await this.perplexityService.chatCompletion({
        messages,
        stream: true,
      });

      let finalMessage = '';
      let totalTokens = 0;

      responseStream.on('data', (chunk) => {
        if (res.writableEnded) {
          return;
        }

        try {
          const lines = chunk.toString().split('\n');
          lines.forEach((line) => {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') {
                if (!res.writableEnded) {
                  this.loggerService.log(
                    'Received [DONE] signal, ending response.',
                  );
                  res.end();
                }
                return;
              }
              const data = JSON.parse(jsonStr);
              const text = data.choices[0].delta?.content;
              if (text && !res.writableEnded) {
                finalMessage = data.choices[0].message.content;
                res.write(`${text}\n`);
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            }
          });
        } catch (error) {
          this.loggerService.error(`Error parsing chunk: ${error}`);
        }
      });

      responseStream.on('end', async () => {
        this.loggerService.log('Response stream ended.');
        if (!res.writableEnded) {
          res.end();
        }
        try {
          this.loggerService.log('Saving the response in db - Start');
          researchDoc.messages.push({
            role: IChatRoles.USER,
            content: prompt,
          });
          researchDoc.messages.push({
            role: IChatRoles.ASSISTANT,
            content: finalMessage,
          });
          researchDoc.token_usage += totalTokens;
          await researchDoc.save();
          this.loggerService.log('Saving the response in db - Completed');
        } catch (error) {
          this.loggerService.error(`Error updating research chat: ${error}`);
        }
      });

      responseStream.on('error', (error) => {
        this.loggerService.error(`Error in streaming response: ${error}`);
        if (!res.writableEnded) {
          throw new HttpException(
            'Error Occured',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      });
    } catch (error: any) {
      this.loggerService.error(
        `Error generating research chat ${chatId} - ${error}`,
      );
      if (!res.writableEnded) {
        throw new HttpException(
          'Error Occured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async searchMediaForChat(
    prompt: string,
    assistantAnswer: string,
    chatId: string,
    messageIndex: number,
    searchType: 'image' | 'video' = 'image', // Default search type is image
  ) {
    try {
      // Log the initiation of the search
      this.loggerService.log(
        JSON.stringify({
          message: 'searchMediaForChat: Initiating search',
          data: { prompt, assistantAnswer, searchType },
        }),
      );

      const cacheKey = `media-query-${searchType}-${prompt}-${assistantAnswer}`;
      const cachedData = (await this.cacheManager.get(cacheKey)) as string;

      let query;
      let cachedLinks = new Set();
      let num = 10;

      // Check if we have cached data and use it if available
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        query = parsedCache.query;
        cachedLinks = new Set(
          parsedCache.result.map((item: any) => item.title),
        );
        num = parseInt(parsedCache.num) + 5;

        this.loggerService.log(
          JSON.stringify({
            message: 'searchMediaForChat: Using cached data',
            data: { query, cachedLinksCount: cachedLinks.size, num },
          }),
        );
      }

      // Generate a new query if there's no cached data or if num > 10
      if (!cachedData || num > 10) {
        const masterPrompt = `
          Given the following prompt and assistant answer, generate 1 concise ${searchType} search query based on the key concepts discussed. Return the query as a JSON array.
  
          Prompt: ${prompt}
          Assistant Answer: ${assistantAnswer}
  
          Example output format:
          {"queries": ["Query 1"]}
  
          Ensure the query is specific, relevant, and likely to return useful ${searchType}s related to the conversation content.
          ${
            num > 10
              ? `Make sure this query is different from previous query: ${query}`
              : ''
          }
        `;

        const resp = await this.openAIService.chatCompletion({
          prompt: masterPrompt,
          responseFormat: CHAT_COMPLETION_RESPONSE_FORMAT.JSON_OBJECT,
          maxTokens: 500,
        });

        const parsedResp = JSON.parse(resp);
        query = parsedResp.queries[0];

        this.loggerService.log(
          JSON.stringify({
            message: 'searchMediaForChat: Generated queries',
            data: { parsedResp },
          }),
        );

        // Reset num when generating a new query
        if (num > 10) {
          num = 5;
        }
      }

      // Initialize Google Custom Search or YouTube Data API
      let items;
      if (searchType === 'image') {
        const customSearch = customsearch('v1');
        const response = await customSearch.cse.list({
          auth: this.configService.get('GOOGLE_API_KEY'),
          cx: this.configService.get('GOOGLE_SEARCH_ENGINE_ID'),
          q: query,
          searchType: 'image',
          num,
        });
        items = response.data.items;
      } else if (searchType === 'video') {
        const youtube_v3 = youtube({
          version: 'v3',
          auth: this.configService.get<string>('GOOGLE_API_KEY'),
        });
        const response = await youtube_v3.search.list({
          q: query,
          type: ['video'],
          part: ['snippet'],
          maxResults: num,
        });
        items = response.data.items;
      }

      // Filter out invalid links and already cached results
      const newUniqueResults = items
        .filter((item: any) => {
          if (searchType === 'image') {
            return (
              /\.(jpg|jpeg|png|gif)(\?|$)/i.test(item.link) &&
              !cachedLinks.has(item.title)
            );
          }
          return !cachedLinks.has(item.title);
        })
        .map((item: any) => {
          if (searchType === 'image') {
            return {
              title: item.title,
              link: item.link,
              thumbnail: item.image.thumbnailLink,
              context: item.image.contextLink,
            };
          }
          return {
            title: item.snippet.title,
            link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail:
              item.snippet.thumbnails.high.url ||
              item.snippet.thumbnails.default.url,
            context: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            id: item.id.videoId,
          };
        });

      // Update cache with new results
      const updatedCacheData = {
        query,
        result: [
          ...Array.from(cachedLinks).map((link) => ({ link })),
          ...newUniqueResults,
        ],
        num,
      };

      const update = {
        $push: {
          [`messages.${messageIndex}.${searchType}s`]: {
            $each: newUniqueResults,
          },
        },
      };

      const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      };

      const updatedChatDoc = await this.researchChatModel.findByIdAndUpdate(
        chatId,
        update,
        options,
      );

      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(updatedCacheData),
        HOURS.ONE,
      );

      // Log the completion of the search
      this.loggerService.log(
        JSON.stringify({
          message: 'searchMediaForChat: Search completed',
          data: { query, newResultCount: newUniqueResults.length },
        }),
      );

      return updatedChatDoc;
    } catch (error: any) {
      // Log any errors that occur during the process
      this.loggerService.error(
        JSON.stringify({
          message: 'searchMediaForChat: Error occurred',
          error: error.message,
          stack: error.stack,
        }),
      );
      throw new HttpException(
        error.message || 'Server failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateDocument(researchId: string, body: UpdateDocumentDTO) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'updateDocument: Initiating document update',
          data: { researchId, ...body },
        }),
      );

      const research = await this.researchModel.findByIdAndUpdate(
        researchId,
        body,
        { new: true },
      );

      this.loggerService.log(
        JSON.stringify({
          message: 'updateDocument: Document updated successfully',
          data: { researchId },
        }),
      );

      return research;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'updateDocument: Error occurred',
          error: error.message,
          stack: error.stack,
        }),
      );
      throw new HttpException(
        error.message || 'Server failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async startChat(userId: string, name: string, systemPrompt?: string) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'startChat: Initiating chat creation',
          data: { userId, name, systemPrompt },
        }),
      );

      const messages = [
        {
          role: IChatRoles.SYSTEM,
          content:
            systemPrompt ||
            'Be precise and concise. and always provide response in well structered valid markdown',
        },
      ];

      const research = new this.researchModel({
        name,
        user_id: userId,
      });

      await research.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'startChat: Research document saved',
          data: { researchId: research._id, userId, name },
        }),
      );

      const chat = new this.researchChatModel({
        messages,
        research_id: research._id,
        model_name: this.configService.get('PERPLEXITY_DEFAULT_MODEL'),
      });

      await chat.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'startChat: Chat document saved',
          data: { chatId: chat._id, researchId: research._id, messages },
        }),
      );

      research.chat_id = chat._id as ObjectId;
      await research.save();
      this.loggerService.log(
        JSON.stringify({
          message: 'startChat: Research document updated with chatId',
          data: { researchId: research._id, chatId: chat._id },
        }),
      );
      await this.userService.addResearch(userId, research._id as ObjectId);

      return research;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'startChat: Error occurred',
          error: error.message,
        }),
      );
      throw new HttpException(
        error.message || 'Server Failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getResearchList(userId: string) {
    try {
      const researches = await this.researchModel
        .find({ user_id: userId })
        .sort({ _id: -1 })
        .populate('chat');
      return researches;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getResearchList: Error occurred',
          error: error.message,
        }),
      );
      throw new HttpException(
        error.message || 'Server Failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getResearchById(id: string) {
    try {
      this.loggerService.log(
        JSON.stringify({
          message: 'getResearchById: Fetching research by id',
          data: { id },
        }),
      );

      const research = await this.researchModel.findById(id).populate('chat');

      if (!research) {
        this.loggerService.error(
          JSON.stringify({
            message: 'getResearchById: No research found with the provided id',
            data: { id },
          }),
        );
        throw new HttpException(
          'No Research with this id',
          HttpStatus.NOT_FOUND,
        );
      }

      this.loggerService.log(
        JSON.stringify({
          message: 'getResearchById: Research fetched successfully',
          data: { id },
        }),
      );

      delete research.chat_id;

      return research;
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'getResearchById: Error occurred',
          error: error.message,
        }),
      );
      throw new HttpException(
        error.message || 'Server Failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteResearchById(id: string) {
    try {
      const research = await this.researchModel.findById(id);

      if (!research) {
        this.loggerService.error(
          JSON.stringify({
            message: 'deleteResearchById: No research with this ID',
            researchId: id,
          }),
        );
        throw new HttpException(
          'No research with this ID',
          HttpStatus.NOT_FOUND,
        );
      }

      await research.delete();
      await this.researchChatModel.deleteById(research.chat_id.toString());

      return 'success';
    } catch (error: any) {
      this.loggerService.error(
        JSON.stringify({
          message: 'deleteResearchById: Error occurred',
          error: error.message,
        }),
      );
      throw new HttpException(
        error.message || 'Server Failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadResearch(researchId: string, res: Response) {
    try {
      const research = await this.researchModel.findById(researchId);

      if (!research) {
        throw new HttpException(
          'No research with this ID',
          HttpStatus.NOT_FOUND,
        );
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();

      const wrappedContent = `
        <html>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Manrope', sans-serif;
              }
              .title {
                width: 100%;
                margin-bottom: 0.5rem;
                text-align: center;
              }
              .image {
                width: 100% !important;
                height: 500px;
                object-fit: contain;
                margin-bottom: 0.5rem;
                margin-top: 0.5rem;
                display: block;
                margin-left: auto;
                margin-right: auto;
              }
              
              @page {
                margin: 40px; /* Set the margin for each page */
              }
            </style>
          </head>
          <body>
            <div class="title">
              <h1>${research.name}</h1>
            </div>
            ${research.document}
          </body>
        </html>
      `;

      await page.setContent(wrappedContent, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '60px', bottom: '60px' },
      });

      await browser.close();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${researchId}.pdf`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        'Error generating PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
