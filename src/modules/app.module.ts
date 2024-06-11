import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';

import { ConfigModule } from '@/common/config/config.module';
import { ConfigService } from '@/common/config/services/config.service';
import { UserModule } from '@/modules/user/user.module';
import { VideoModule } from '@/modules/video/video.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { LoggerModule } from '@/common/logger/logger.module';
import { HttpModule } from '@/common/http/http.module';
import { PublicModule } from './public/public.module';

import { redisStore } from 'cache-manager-redis-yet';

type NestModuleImport =
  | Type<any>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference<any>;

const appModules: NestModuleImport[] = [
  UserModule,
  VideoModule,
  AuthModule,
  LoggerModule,
  HttpModule,
  ConfigModule,
];

@Module({
  imports: [
    ...appModules,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL'),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<string>('REDIS_PORT');
        const url = `redis://${host}:${port}`;
        const store = await redisStore({
          url,
        });
        return {
          store,
        };
      },
      inject: [ConfigService],
    }),
    PublicModule,
  ],
})
export class AppModule {}
