import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AudioDocument = HydratedDocument<Audio>;

@Schema()
export class Audio extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  url: string; // Audio URL

  @Prop({ type: Date, default: Date.now() })
  created_at: Date;

  @Prop({ type: Date, default: Date.now() })
  updated_at: Date;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId }], ref: 'Dubbing',default:[] })
  dubbings: MongooseSchema.Types.ObjectId[];
}

export const AudioSchema = SchemaFactory.createForClass(Audio);
