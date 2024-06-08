import { Module } from '@nestjs/common';
import { PublicController } from './controller/public.controller';
import { PublicService } from './services/public.service';
import { VideoModule } from '@/modules/video/video.module';

@Module({
  imports: [VideoModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
