// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

export const YOUTUBE_HOST_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//iu;
export const YOUTUBE_WATCH_REGEX = /https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=[\w-]+/giu;
export const YOUTUBE_SHORT_REGEX = /https?:\/\/youtu\.be\/[\w-]+/giu;
export const YOUTUBE_SHORTS_REGEX = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/[\w-]+/giu;
export const YOUTUBE_PLAYLIST_REGEX = /https?:\/\/(?:www\.)?youtube\.com\/playlist\?list=[\w-]+/giu;

export const YOUTUBE_SUMMARIZE_VERBS = [
  'summarize',
  'summary',
  'tl;dr',
  'transcript',
  'what does this video say',
  'explain this video',
  'key points',
  'highlights',
];
