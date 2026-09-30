/** Lifecycle of one video-service generation row (`GET /videos/:id`). */
export enum VideoGenerationStatus {
  QUEUED = 'QUEUED',
  STARTING = 'STARTING',
  GENERATING = 'GENERATING',
  FINALIZING = 'FINALIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  CANCELLED = 'CANCELLED',
}
