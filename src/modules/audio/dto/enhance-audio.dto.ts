import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

enum IDolbyContenType {
  CONFERENCE = 'conference',
  INTERVIEW = 'interview',
  LECTURE = 'lecture',
  MEETING = 'meeting',
  MOBILE_PHONE = 'mobile_phone',
  MUSIC = 'music',
  PODCAST = 'podcast',
  STUDIO = 'studio',
  VOICE_OVER = 'voice_over',
  VOICE_RECORDING = 'voice_recording',
}

enum IDolbyAmount {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAX = 'max',
  AUTO = 'auto',
}

class Loudness {
  @IsBoolean()
  enable: boolean;

  @IsBoolean()
  dialog_intelligence: boolean;
}

class Reduction {
  @IsBoolean()
  enable: boolean;

  @IsEnum(IDolbyAmount)
  amount: IDolbyAmount;
}

class Noise {
  @IsOptional()
  @ValidateNested()
  @Type(() => Reduction)
  reduction?: Reduction;
}

class RangeControl {
  @IsBoolean()
  enable: boolean;

  @IsEnum(IDolbyAmount)
  amount: IDolbyAmount;
}

class Dynamics {
  @IsOptional()
  @ValidateNested()
  @Type(() => RangeControl)
  range_control?: RangeControl;
}

class Isolation {
  @IsBoolean()
  enable: boolean;

  @IsNumber()
  amount: number; // Valid range is 0 to 100
}

class SibilanceReduction {
  @ValidateNested()
  @Type(() => Reduction)
  reduction: Reduction;
}

class ClickReduction {
  @ValidateNested()
  @Type(() => Reduction)
  reduction: Reduction;
}

class PlosiveReduction {
  @ValidateNested()
  @Type(() => Reduction)
  reduction: Reduction;
}

class Speech {
  @IsOptional()
  @ValidateNested()
  @Type(() => Isolation)
  isolation?: Isolation;

  @IsOptional()
  @ValidateNested()
  @Type(() => SibilanceReduction)
  sibilance?: SibilanceReduction;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClickReduction)
  click?: ClickReduction;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlosiveReduction)
  plosive?: PlosiveReduction;
}

class MusicDetection {
  @IsBoolean()
  enable: boolean;
}

class Music {
  @ValidateNested()
  @Type(() => MusicDetection)
  detection: MusicDetection;
}

export class EnhanceAudioDto {
  @IsOptional()
  @IsEnum(IDolbyContenType)
  content?: IDolbyContenType;

  @IsOptional()
  @ValidateNested()
  @Type(() => Loudness)
  loudness?: Loudness;

  @IsOptional()
  @ValidateNested()
  @Type(() => Noise)
  noise?: Noise;

  @IsOptional()
  @ValidateNested()
  @Type(() => Dynamics)
  dynamics?: Dynamics;

  @IsOptional()
  @ValidateNested()
  @Type(() => Speech)
  speech?: Speech;

  @IsOptional()
  @ValidateNested()
  @Type(() => Music)
  music?: Music;
}
