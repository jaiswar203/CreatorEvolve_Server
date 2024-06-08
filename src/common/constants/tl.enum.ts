import { IENGINES } from '@/schemas/services/tl.index.schema';

export enum TL_ENGINES {
  VISUAL = 'visual',
  CONVERSATION = 'conversation',
  TEXT_IN_VIDEO = 'text_in_video',
}

export enum TL_ENGINES_NAME {
  MARENGO = 'marengo2.6',
  PEGASUS = 'pegasus1',
}

export const TL_Default_Engine: IENGINES[] = [
  {
    name: TL_ENGINES_NAME.MARENGO,
    options: [
      TL_ENGINES.CONVERSATION,
      TL_ENGINES.VISUAL,
      TL_ENGINES.TEXT_IN_VIDEO,
    ],
  },
  {
    name: TL_ENGINES_NAME.PEGASUS,
    options: [TL_ENGINES.VISUAL, TL_ENGINES.CONVERSATION],
  },
];

export enum TL_DEFAULT_NAME {
  YOUTUBE_VIDEOS = 'YOUTUBE_VIDEOS',
}

export enum TL_GENERATE_TEXT_TYPES {
  TITLE = 'title',
  TOPIC = 'topic',
  HASHTAG = 'hashtag',
}

export const TL_DEFAULT_GENERATE_TEXT_TYPE = [
  TL_GENERATE_TEXT_TYPES.TITLE,
  TL_GENERATE_TEXT_TYPES.TOPIC,
  TL_GENERATE_TEXT_TYPES.HASHTAG,
];

export type TL_GENERATE_SUMMARY_TYPES = 'summary' | 'highlight' | 'chapter';

export enum TL_GENERATE_TYPES{
  SUMMARY="summary",
  CHAPTER="chapter",
  HIGHLIGHT="highlight"
}