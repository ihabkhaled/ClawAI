import type { VideoProcessingFailureReason } from '@claw/shared-types';

import type { VideoFrameDelivery } from '../../../common/enums/video-frame-delivery.enum';
import type { HelperExecution } from './vision-helper.types';

/**
 * A processed video's probe facts as file-service's internal content endpoint
 * serves them (multimodal batch 8). Absent for every non-video file, and for a
 * video whose job has not written `extractionMetadata.media` yet.
 */
export type FileMediaSummary = {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean | null;
  failureReason: VideoProcessingFailureReason | null;
};

/** One JPEG frame from `POST /internal/files/:id/video-frames`. */
export type VideoFrameImage = {
  timestampMs: number;
  mimeType: string;
  base64: string;
};

/** The frames request: never throws, degrades to a reason. */
export type VideoFramesFetchResult =
  | { ok: true; frames: VideoFrameImage[]; latencyMs: number }
  | { ok: false; reason: string; latencyMs: number };

export type VideoFramesCacheEntry = {
  result: Promise<VideoFramesFetchResult>;
  expiresAt: number;
};

/** The helper's description of one frame, for a lane that cannot see. */
export type VideoFrameObservation = {
  timestampMs: number;
  helperProvider: string;
  helperModel: string;
  text: string;
};

/**
 * One video's frames as ONE lane received them. A seeing lane carries the
 * images; a blind lane carries the helper's timestamped observations; `NONE`
 * carries the reason the lane used the transcript only.
 */
export type VideoFrameSet = {
  fileId: string;
  filename: string;
  timestampsMs: number[];
  frameDelivery: VideoFrameDelivery;
  frames: VideoFrameImage[];
  observations: VideoFrameObservation[];
  reason?: string;
};

/** Everything `formatVideoContextBlock` needs for one video. */
export type VideoContextBlockInput = {
  filename: string;
  media: FileMediaSummary | undefined;
  document: string;
  frameSet: VideoFrameSet | undefined;
};

/** A timestamp found in the question, with the span it occupied. */
export type QuestionTimestampMatch = {
  index: number;
  end: number;
  ms: number;
};

/** What the manager learned for one video on one lane, before the plan is rewritten. */
export type VideoLaneOutcome = {
  frameSet: VideoFrameSet;
  helperExecutions: HelperExecution[];
  /** Frames handed to the vision helper (spends the per-turn helper cap). */
  helperFramesAttempted: number;
  latencyMs: number;
};

/** One blind lane's frame observations, keyed for the shared file-share fit. */
export type FrameObservationKey = {
  key: string;
  fileId: string;
  timestampMs: number;
};

/** One video's part of the `videoDelivery` log line (the lane is added by the manager). */
export type VideoDeliveryLogFields = {
  fileId: string;
  strategy: string;
  frameDelivery: VideoFrameDelivery | null;
  frames: number;
  latencyMs: number;
  reason: string | null;
};

/** The content-free `videoDelivery` log line. Never transcript text, never frames. */
export type VideoDeliveryLogLine = VideoDeliveryLogFields & {
  provider: string;
  model: string;
};
