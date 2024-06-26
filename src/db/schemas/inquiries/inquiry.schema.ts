import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum InquiryTypes {
  PROFESSIONAL_VOICE_CLONE = 'professional_voice_clone',
  USER_BUG = 'user_bug',
}

export enum InquiryStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

@Schema()
export class Inquiry extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone: string;

  @Prop({ type: String, required: true })
  type: InquiryTypes;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ default: Date.now })
  date: Date;

  @Prop({ type: String, default: InquiryStatus.PENDING })
  status: InquiryStatus;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User' })
  user_id: mongoose.Types.ObjectId;
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry);
