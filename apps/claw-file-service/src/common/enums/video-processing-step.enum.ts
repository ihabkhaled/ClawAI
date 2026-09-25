/**
 * The step a video job was on (`VideoProcessingManager`), for the cancel log
 * line and the cancel checkpoints. `REQUESTED` is the cancel route itself —
 * no job step had observed the cancel yet.
 */
export enum VideoProcessingStep {
  REQUESTED = 'REQUESTED',
  PROBE = 'PROBE',
  THUMBNAIL = 'THUMBNAIL',
  PLAN_CHECK = 'PLAN_CHECK',
  AUDIO_EXTRACT = 'AUDIO_EXTRACT',
  VOLUME_DETECT = 'VOLUME_DETECT',
  TRANSCRIPTION = 'TRANSCRIPTION',
  SAVE = 'SAVE',
}
