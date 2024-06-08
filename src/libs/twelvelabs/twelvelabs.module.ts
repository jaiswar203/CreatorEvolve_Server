import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TLIndex, TLIndexSchema } from '@/schemas/services/tl.index.schema';
import { TwelveLabsService } from './services/twelvelabs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TLIndex.name,
        schema: TLIndexSchema,
      },
    ]),
  ],
  providers: [TwelveLabsService],
  exports: [TwelveLabsService],
})
export class TwelveLabsModule {}
