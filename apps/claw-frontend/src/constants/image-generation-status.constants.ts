import { ImageGenerationStatus } from '@/enums/image-generation-status.enum';

/**
 * The image card's status line per generation status. Exhaustive over the
 * enum, so a new status without copy fails typecheck instead of rendering
 * English (the old `getImageStatusLabel` returned literals).
 */
export const IMAGE_STATUS_LABEL_KEYS: Readonly<Record<ImageGenerationStatus, string>> = {
  [ImageGenerationStatus.QUEUED]: 'mediaUi.imageStatus.queued',
  [ImageGenerationStatus.STARTING]: 'mediaUi.imageStatus.starting',
  [ImageGenerationStatus.GENERATING]: 'mediaUi.imageStatus.generating',
  [ImageGenerationStatus.FINALIZING]: 'mediaUi.imageStatus.finalizing',
  [ImageGenerationStatus.COMPLETED]: 'mediaUi.imageStatus.completed',
  [ImageGenerationStatus.FAILED]: 'mediaUi.imageStatus.failed',
  [ImageGenerationStatus.TIMED_OUT]: 'mediaUi.imageStatus.timedOut',
  [ImageGenerationStatus.CANCELLED]: 'mediaUi.imageStatus.cancelled',
};

/** No generation row yet (the card renders before the first poll answers). */
export const IMAGE_STATUS_PREPARING_KEY = 'mediaUi.imageStatus.preparing';
