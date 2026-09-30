import { VideoGenerationStatus } from '@/enums/video-generation-status.enum';

/**
 * The video card's status line per generation status. Exhaustive over the
 * enum, so a new status without copy fails typecheck instead of rendering
 * English.
 */
export const VIDEO_STATUS_LABEL_KEYS: Readonly<Record<VideoGenerationStatus, string>> = {
  [VideoGenerationStatus.QUEUED]: 'mediaUi.videoStatus.queued',
  [VideoGenerationStatus.STARTING]: 'mediaUi.videoStatus.starting',
  [VideoGenerationStatus.GENERATING]: 'mediaUi.videoStatus.generating',
  [VideoGenerationStatus.FINALIZING]: 'mediaUi.videoStatus.finalizing',
  [VideoGenerationStatus.COMPLETED]: 'mediaUi.videoStatus.completed',
  [VideoGenerationStatus.FAILED]: 'mediaUi.videoStatus.failed',
  [VideoGenerationStatus.TIMED_OUT]: 'mediaUi.videoStatus.timedOut',
  [VideoGenerationStatus.CANCELLED]: 'mediaUi.videoStatus.cancelled',
};

/** No generation row yet (the card renders before the first poll answers). */
export const VIDEO_STATUS_PREPARING_KEY = 'mediaUi.videoStatus.preparing';
