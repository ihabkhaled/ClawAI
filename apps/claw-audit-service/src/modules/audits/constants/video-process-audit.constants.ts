/** Audit rows for `file.video_process_*` use the same entity type as every other file event. */
export const VIDEO_PROCESS_AUDIT_ENTITY_TYPE = 'file';

export const VIDEO_PROCESS_AUDIT_ACTIONS = {
  REQUESTED: 'file.video_process_requested',
  COMPLETED: 'file.video_process_completed',
  FAILED: 'file.video_process_failed',
} as const;
