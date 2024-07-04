import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { IDolbyContenType, IDolbyAmount } from '@/libs/dolby/enum/index';

export type AudioEnhanceDocument = HydratedDocument<AudioEnhance>;

const DolbyEnhanceSettingsSchema = new MongooseSchema({
  content: {
    type: String,
    enum: Object.values(IDolbyContenType),
  },
  loudness: {
    enable: Boolean,
    dialog_intelligence: Boolean,
  },
  noise: {
    reduction: {
      enable: Boolean,
      amount: {
        type: String,
        enum: ['low', 'medium', 'high', 'max', 'auto'],
      },
    },
  },
  dynamics: {
    range_control: {
      enable: Boolean,
      amount: {
        type: String,
        enum: ['low', 'medium', 'high', 'max', 'auto'],
      },
    },
  },
  speech: {
    isolation: {
      enable: Boolean,
      amount: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    sibilance: {
      reduction: {
        enable: Boolean,
        amount: {
          type: String,
          enum: ['low', 'medium', 'high', 'max', 'auto'],
        },
      },
    },
    click: {
      reduction: {
        enable: Boolean,
        amount: {
          type: String,
          enum: ['low', 'medium', 'high', 'max', 'auto'],
        },
      },
    },
    plosive: {
      reduction: {
        enable: Boolean,
        amount: {
          type: String,
          enum: ['low', 'medium', 'high', 'max', 'auto'],
        },
      },
    },
  },
  music: {
    detection: {
      enable: Boolean,
    },
  },
});

@Schema()
export class AudioEnhance extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Audio' })
  audio_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Video' })
  video_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: DolbyEnhanceSettingsSchema })
  settings: typeof DolbyEnhanceSettingsSchema;

  @Prop({ type: String })
  url: string; // Audio URL

  @Prop({ type: String })
  dolby_job_id: string; //Dolby Job Id

  @Prop({ type: String, default: 'pending' })
  dolby_job_status: string; //Dolby Job Status

  @Prop({ type: Date, default: Date.now() })
  created_at: Date;

  @Prop({ type: Date, default: Date.now() })
  updated_at: Date;
}

export const AudioEnhanceSchema = SchemaFactory.createForClass(AudioEnhance);
