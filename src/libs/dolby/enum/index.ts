export const DOLBY_ACCESS_TOKEN = 'DOLBY_ACCESS_TOKEN';

export enum IDolbyContenType {
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

export type IDolbyAmount = 'low' | 'medium' | 'high' | 'max' | 'auto';

export interface IDolbyEnhanceRequest {
  input_url: string;
  output_url: string; // s3 url for putting the object
  content?: IDolbyContenType;
  loudness?: {
    enable: boolean;
    dialog_intelligence: boolean;
  }; // Whether or not to apply loudness correction enhancements to your media.
  noise?: {
    reduction?: {
      enable: boolean;
      amount: IDolbyAmount;
    };
  };
  dynamics?: {
    range_control?: {
      enable: boolean;
      amount: IDolbyAmount;
    };
  };
  speech?: {
    isolation?: {
      enable: boolean;
      amount: number; // Valid range is 0 to 100
    };
    sibilance?: {
      reduction: {
        enable: boolean;
        amount: IDolbyAmount;
      };
    };
    click?: {
      reduction: {
        enable: boolean;
        amount: IDolbyAmount;
      };
    };
    plosive?: {
      reduction: {
        enable: boolean;
        amount: IDolbyAmount;
      };
    };
  };
  music?: {
    detection: {
      enable: boolean;
    };
  };
}
