import {
  VIDEO_STATUS_LABEL_KEYS,
  VIDEO_STATUS_PREPARING_KEY,
} from '@/constants/video-generation-status.constants';
import { VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR } from '@/constants/video.constants';
import { VideoGenerationStatus } from '@/enums/video-generation-status.enum';
import type { VideoGeneration } from '@/types/video-generation.types';

/** The translation key for the video card's status line (a KEY: the card calls `t()`). */
export function getVideoStatusLabelKey(status?: VideoGenerationStatus): string {
  return status === undefined ? VIDEO_STATUS_PREPARING_KEY : VIDEO_STATUS_LABEL_KEYS[status];
}

export function isTerminalVideoStatus(status: VideoGenerationStatus): boolean {
  return [
    VideoGenerationStatus.COMPLETED,
    VideoGenerationStatus.FAILED,
    VideoGenerationStatus.TIMED_OUT,
    VideoGenerationStatus.CANCELLED,
  ].includes(status);
}

export function isInProgressVideoStatus(status: VideoGenerationStatus): boolean {
  return [
    VideoGenerationStatus.QUEUED,
    VideoGenerationStatus.STARTING,
    VideoGenerationStatus.GENERATING,
    VideoGenerationStatus.FINALIZING,
  ].includes(status);
}

/** The row that took this job over, when the server resolved one other than the row asked for. */
export function getSupersedingVideoGenerationId(generation: VideoGeneration): string | undefined {
  const latestId = generation.latest?.id;
  return latestId !== undefined && latestId !== generation.id ? latestId : undefined;
}

/** The asked-for row presented as its chain head, so the card shows what the fallback produced. */
export function toLatestVideoGeneration(generation: VideoGeneration): VideoGeneration {
  const latest = generation.latest;
  if (!latest || latest.id === generation.id) {
    return generation;
  }
  return { ...generation, ...latest, prompt: generation.prompt, latest: null };
}

/** Whether a chat-connector model id is a video-output model (drives the picker badge). */
export function isVideoOutputModel(connectorProvider: string, modelKey: string): boolean {
  const pattern = VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.get(connectorProvider.toUpperCase());
  return pattern !== undefined && pattern.test(modelKey);
}
