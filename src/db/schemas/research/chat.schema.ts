import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

export type ResearchChatDocument = HydratedDocument<ResearchChat>;

export enum IChatRoles {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface IChatMessage {
  role: IChatRoles;
  content: string;
  images?: string[];
  videos?: string[];
}

@Schema({ collection: 'ResearchChat' })
export class ResearchChat extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Research' })
  research_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: [], default: [] })
  messages: IChatMessage[];

  @Prop({ type: String })
  model_name: string;

  @Prop({ type: Number, default: 0 })
  token_usage: number;
}

const ResearchChatSchema = SchemaFactory.createForClass(ResearchChat);

ResearchChatSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
});

export { ResearchChatSchema };
