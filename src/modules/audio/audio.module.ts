import { Module } from '@nestjs/common';
import { AudioController } from './controller/audio.controller';
import { AudioService } from './services/audio.service';
import { ElevenLabsModule } from '@/libs/elevenlabs/elevenlabs.module';
import { StorageModule } from '@/common/storage/storage.module';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from '@/db/schemas/media/video.schema';
import { Dubbing, DubbingSchema } from '@/db/schemas/media/dubbing.schema';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@/common/config/services/config.service';
import { DubbingConsumer } from './processor/dubbing.processor';
import { DUBBING_QUEUE } from '@/common/constants/queue.contant';
import { UserModule } from '../user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Audio, AudioSchema } from '@/db/schemas/media/audio.schema';
import { Voice, VoiceSchema } from '@/db/schemas/media/voice.schema';
import { MailModule } from '@/common/mail/mail.module';
import { Inquiry, InquirySchema } from '@/db/schemas/inquiries/inquiry.schema';

@Module({
  imports: [
    ElevenLabsModule,
    StorageModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Video.name,
        schema: VideoSchema,
      },
      {
        name: Audio.name,
        schema: AudioSchema,
      },
      {
        name: Dubbing.name,
        schema: DubbingSchema,
      },
      {
        name: Voice.name,
        schema: VoiceSchema,
      },
      {
        name: Inquiry.name,
        schema: InquirySchema,
      },
    ]),
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: DUBBING_QUEUE }),
    UserModule,
    MailModule
  ],
  controllers: [AudioController],
  providers: [AudioService, JwtService, DubbingConsumer],
})
export class AudioModule {}
