import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Document } from 'mongoose';

export type VoiceDocument = HydratedDocument<Voice>;

export enum EL_VOICE_TYPE {
  INSTANT = 'instant',
  PROFESSIONAL = 'professional',
  GENERATED = 'generated',
}

@Schema()
export class Voice extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  el_voice_id: string;

  @Prop({ type: String, enum: EL_VOICE_TYPE })
  el_voice_type: EL_VOICE_TYPE;

  @Prop({ type: String })
  description: string;

  @Prop({ type: [{ type: String }] })
  files: string[];

  @Prop({ type: Object })
  labels: { [key: string]: string };

  @Prop({ type: mongoose.Types.ObjectId })
  user_id: string;
}

export const VoiceSchema = SchemaFactory.createForClass(Voice);
