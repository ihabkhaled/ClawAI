import type { RuntimeProgressStage } from '@claw/shared-types';

import {
  IMAGE_STATUS_LABEL_KEYS,
  IMAGE_STATUS_PREPARING_KEY,
} from '@/constants/image-generation-status.constants';
import {
  IMAGE_RUNTIME_STAGE_FALLBACK_KEY,
  IMAGE_RUNTIME_STAGE_LABEL_KEYS,
} from '@/constants/image.constants';
import { ImageGenerationStatus } from '@/enums';
import type { ImageGeneration } from '@/types/image-generation.types';

/**
 * The translation key for the image card's status line. Returns a KEY, not
 * text: the card calls `t()` on it, so every locale gets its own words.
 */
export function getImageStatusLabelKey(status?: ImageGeneration['status']): string {
  return status === undefined ? IMAGE_STATUS_PREPARING_KEY : IMAGE_STATUS_LABEL_KEYS[status];
}

export function resolveImageUrl(url: string, apiBaseUrl: string): string {
  if (url.startsWith('/api/')) {
    return `${apiBaseUrl.replace('/api/v1', '')}${url}`;
  }
  return url;
}

export function isTerminalImageStatus(status: ImageGenerationStatus): boolean {
  return [
    ImageGenerationStatus.COMPLETED,
    ImageGenerationStatus.FAILED,
    ImageGenerationStatus.TIMED_OUT,
    ImageGenerationStatus.CANCELLED,
  ].includes(status);
}

export function isInProgressImageStatus(status: ImageGenerationStatus): boolean {
  return [
    ImageGenerationStatus.QUEUED,
    ImageGenerationStatus.STARTING,
    ImageGenerationStatus.GENERATING,
    ImageGenerationStatus.FINALIZING,
  ].includes(status);
}

/** The i18n key for a runtime stage, or the generic "working" line for one not mapped. */
export function getImageRuntimeStageKey(stage: RuntimeProgressStage): string {
  return IMAGE_RUNTIME_STAGE_LABEL_KEYS.get(stage) ?? IMAGE_RUNTIME_STAGE_FALLBACK_KEY;
}

/**
 * The row that took this job over, when the server resolved one other than
 * the row asked for. A FAILED row with a successor is not the end of the job.
 */
export function getSupersedingGenerationId(generation: ImageGeneration): string | undefined {
  const latestId = generation.latest?.id;
  return latestId !== undefined && latestId !== generation.id ? latestId : undefined;
}

/**
 * The asked-for row presented as its chain head, so the card shows what the
 * fallback or alternate produced while the head's own stream is opened.
 */
export function toLatestImageGeneration(generation: ImageGeneration): ImageGeneration {
  const latest = generation.latest;
  if (!latest || latest.id === generation.id) {
    return generation;
  }
  return {
    ...generation,
    id: latest.id,
    status: latest.status,
    provider: latest.provider,
    model: latest.model,
    errorCode: latest.errorCode ?? null,
    errorMessage: latest.errorMessage ?? null,
    supersededById: latest.supersededById ?? null,
    assets: latest.assets,
    runtimeProgress: null,
  };
}
