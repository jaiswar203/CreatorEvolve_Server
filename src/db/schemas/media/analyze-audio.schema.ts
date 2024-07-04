import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AudioAnalyzeDocument = HydratedDocument<AudioAnalyze>;

export interface IAudioAnalyzeMediaType {
  container: {
    kind: string;
    duration: number;
    bitrate: number;
    size: number;
  };
  audio: {
    codec: string;
    channels: number;
    sample_rate: number;
    duration: number;
    bitrate: number;
  };
}

export interface ISummary {
  speech: string;
  noise_quality: string;
  voice_quality: string;
}

export interface IAudioAnalyzeDiagnosis {
  quality_score: {
    average: number;
    distribution: {
      lower_bound: number;
      upper_bound: number;
      duration: number;
      percentage: number;
    }[];
    worst_segment: {
      start: number;
      end: number;
      score: number;
    };
  };
  noise_score: {
    average: number;
    distribution: {
      lower_bound: number;
      upper_bound: number;
      duration: number;
      percentage: number;
    }[];
  };
  clipping: {
    events: number;
  };
  loudness: {
    measured: number;
    range: number;
    gating_mode: string;
    sample_peak: number;
    true_peak: number;
  };
  music: {
    percentage: number;
  };
  silence: {
    percentage: number;
    at_beginning: number;
    at_end: number;
    num_sections: number;
    silent_channels: number[];
  };
  speech: {
    percentage: number;
    events: {
      plosive: number;
      sibilance: number;
    };
  };
}

@Schema()
export class AudioAnalyze extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Audio' })
  audio_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Video' })
  video_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: {
      quality_score: {
        average: { type: Number },
        distribution: [
          {
            lower_bound: { type: Number },
            upper_bound: { type: Number },
            duration: { type: Number },
            percentage: { type: Number },
          },
        ],
        worst_segment: {
          start: { type: Number },
          end: { type: Number },
          score: { type: Number },
        },
      },
      noise_score: {
        average: { type: Number },
        distribution: [
          {
            lower_bound: { type: Number },
            upper_bound: { type: Number },
            duration: { type: Number },
            percentage: { type: Number },
          },
        ],
      },
      clipping: {
        events: { type: Number },
      },
      loudness: {
        measured: { type: Number },
        range: { type: Number },
        gating_mode: { type: String },
        sample_peak: { type: Number },
        true_peak: { type: Number },
      },
      music: {
        percentage: { type: Number },
      },
      silence: {
        percentage: { type: Number },
        at_beginning: { type: Number },
        at_end: { type: Number },
        num_sections: { type: Number },
        silent_channels: [Number],
      },
      speech: {
        percentage: { type: Number },
        events: {
          plosive: { type: Number },
          sibilance: { type: Number },
        },
      },
    },
  })
  diagnosis: IAudioAnalyzeDiagnosis;

  @Prop({
    type: {
      container: {
        kind: String,
        duration: Number,
        bitrate: Number,
        size: Number,
      },
      audio: {
        codec: String,
        channels: Number,
        sample_rate: Number,
        duration: Number,
        bitrate: Number,
      },
    },
  })
  media_info: IAudioAnalyzeMediaType;

  @Prop({ type: Object, default: {} })
  summary: ISummary;

  @Prop({ type: String })
  dolby_job_id: string;

  @Prop({ type: String })
  dolby_job_status: string;

  @Prop({ type: Date, default: Date.now() })
  created_at: Date;

  @Prop({ type: Date, default: Date.now() })
  updated_at: Date;
}

export const AudioAnalyzeSchema = SchemaFactory.createForClass(AudioAnalyze);
