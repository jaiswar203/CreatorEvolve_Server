import { Module } from '@nestjs/common';
import { PublicController } from './controller/public.controller';
import { PublicService } from './services/public.service';
import { VideoModule } from '@/modules/video/video.module';
import { AudioModule } from '../audio/audio.module';

@Module({
  imports: [VideoModule, AudioModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
