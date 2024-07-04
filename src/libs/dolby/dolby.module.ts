import { Module } from '@nestjs/common';
import { DolbyService } from './services/dolby.service';

@Module({
  providers: [DolbyService],
  exports: [DolbyService],
})
export class DolbyModule {}
