import { Module } from '@nestjs/common';
import { ElevenLabsService } from './services/elevenlabs.service';

@Module({
  providers: [ElevenLabsService],
  exports: [ElevenLabsService],
})
export class ElevenLabsModule {}
