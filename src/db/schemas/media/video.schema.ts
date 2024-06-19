import { VIDEO_TYPES } from '@/common/constants/video.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type VideoDocument = HydratedDocument<Video>;

export enum TL_TASK_STATUS_ENUM {
  SUCCESS = 'ready',
  FAILED = 'failed',
}

export interface VideoMetaData {
  width: number;
  height: number;
}

// tl=TwelveLabs
@Schema()
export class Video extends Document {
  @Prop({ type: String })
  tl_video_id: string;

  @Prop({ type: String })
  tl_task_id: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String, enum: TL_TASK_STATUS_ENUM })
  tl_task_status: TL_TASK_STATUS_ENUM;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: VIDEO_TYPES, required: true })
  type: VIDEO_TYPES;

  @Prop({ type: String })
  thumbnail: string;

  @Prop({ type: String })
  url: string; // video URL

  @Prop({ type: Object })
  metadata: VideoMetaData;

  @Prop({ type: Date, default: Date.now() })
  created_at: Date;

  @Prop({ type: Date, default: Date.now() })
  updated_at: Date;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId }], ref: 'Dubbing',default:[] })
  dubbings: MongooseSchema.Types.ObjectId[];
}

export const VideoSchema = SchemaFactory.createForClass(Video);
