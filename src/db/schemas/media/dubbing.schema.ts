import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DubbingDocument = HydratedDocument<Dubbing>;

// el=ElevenLabs
@Schema()
export class Dubbing extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Video' })
  video_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Audio' })
  audio_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  el_dubbing_id: string;

  @Prop({ type: String })
  media_key: string; // video URL

  @Prop({ type: String, enum: ['completed', 'failed','pending'] })
  status: string;

  @Prop({
    type: [
      {
        type: String,
      },
    ],
    default: [],
  })
  target_languages: string[]; // video URL

  @Prop({ type: Date, default: Date.now() })
  created_at: Date;

  @Prop({ type: Date, default: Date.now() })
  updated_at: Date;
}

export const DubbingSchema = SchemaFactory.createForClass(Dubbing);
