import { downloadVeo, pollVeo, startVeo } from '../adapters/gemini-veo.adapter';
import { downloadXaiVideo, pollXaiVideo, startXaiVideo } from '../adapters/xai-video.adapter';
import type { VideoProviderClient } from '../types/video-generation.types';

export const geminiVeoClient: VideoProviderClient = {
  start: startVeo,
  poll: pollVeo,
  download: downloadVeo,
};

export const xaiVideoClient: VideoProviderClient = {
  start: startXaiVideo,
  poll: pollXaiVideo,
  download: downloadXaiVideo,
};
