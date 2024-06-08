import { ConfigService } from '@/common/config/services/config.service';
import { Global, Module } from '@nestjs/common';

import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import pretty from 'pino-pretty';
import { LoggerService } from './services/logger.service';

const stream = pretty({
  colorize: true,
  levelFirst: true,
  translateTime: 'SYS:standard',
  ignore: 'pid',
});

declare module 'http' {
  interface IncomingMessage {
    requestId: string;
  }
}

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        pinoHttp: [
          {
            name: 'CE API',
            level: 'trace',
            transport: {
              target: 'pino-pretty',
            },
            redact: ['req.headers', 'res.headers'],
            useLevel: 'trace',
          },
          !configService.IS_PRODUCTION ? stream : undefined,
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
