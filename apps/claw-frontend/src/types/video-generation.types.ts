import type { VideoGenerationStatus } from '@/enums/video-generation-status.enum';

export type VideoGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
};

/** One generation row, without the chain head (`latest`). */
export type VideoGenerationRow = {
  id: string;
  status: VideoGenerationStatus;
  provider: string;
  model: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  /** The row an AUTO fallback continued this job on. */
  supersededById: string | null;
  isAutoMode: boolean;
  asset: VideoGenerationAsset | null;
};

/** `GET /videos/:id`: the row asked for plus the head of its fallback chain. */
export type VideoGeneration = VideoGenerationRow & {
  latest?: VideoGenerationRow | null;
};

/** `POST /videos/:id/retry` answer: the row to follow. */
export type VideoGenerationRetryResult = {
  generationId: string;
};

/** `POST /videos/:id/cancel` answer: the row and its status after the call. */
export type VideoGenerationCancelResult = {
  id: string;
  status: VideoGenerationStatus;
};

/** Which row the listener is following for a given card. */
export type VideoGenerationFollowState = {
  rootId: string | undefined;
  trackedId: string | undefined;
};
