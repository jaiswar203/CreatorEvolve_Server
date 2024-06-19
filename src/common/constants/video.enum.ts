export enum VIDEO_TYPES {
  YOUTUBE = 'YOUTUBE',
  FILE_UPLOAD = 'FILE_UPLOAD',
}

export const RETRIEVE_ID_FROM_TL_JOB = 'retrieve-videoId-from-tl';

export const JOB_RETRY_AFTER_ONE_MINUTE = 60000;

export const JOB_NUMBER_OF_ATTEMPTS = 5;

export const JOB_DELAY = 30000;

export const JOB_TIMEOUT = 15000;

export const CHAPTER_CUSTOM_PROMPT = `Your goal is to extract engaging short form content which is standalone and appealing to mass audience. you should also specify the timeline of the shorts content i.e start and end
Generate total 4 short form video of length no longer than 1 minute
`;
// export const CHAPTER_CUSTOM_PROMPT = `As a professional video editor, you extract standalone, and engaging. 30-second videos from a given video file.

// Complete the following steps for each extracted segment:
// Summary: Provide a summary
// Timeline: Specify the time range (e.g., 0:00 - 0:30) 
// Title: Suggest a title for the video.

// `;



export interface IFormattedDataResponse {
  segments: {
    title: string;
    start: number;
    end: number;
    summary: string;
  }[];
}


export enum VIDEO_QUALITY{
  HIGH="high",
  LOW="low"
}