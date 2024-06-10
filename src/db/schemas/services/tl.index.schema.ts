import { TL_ENGINES, TL_ENGINES_NAME } from '@/common/constants/tl.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export interface IENGINES {
  name: TL_ENGINES_NAME;
  options: TL_ENGINES[];
}

export type TLIndexDocument = HydratedDocument<TLIndex>;

@Schema()
export class TLIndex extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  tl_index_id: string;

  @Prop({
    type: [{ name: String, options: [{ type: String, enum: TL_ENGINES }] }],
    required: true,
  })
  engines: IENGINES[];
}

export const TLIndexSchema = SchemaFactory.createForClass(TLIndex);
