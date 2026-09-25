/**
 * What happened to a video's audio track (multimodal batch 7). Only
 * `TRANSCRIBED` means a paid transcription call succeeded; every other value is
 * stated in the video's document so the model is told why there are no words.
 */
export enum VideoAudioStatus {
  TRANSCRIBED = 'TRANSCRIBED',
  /** The container has no audio stream. Nothing was extracted or charged. */
  NO_AUDIO_TRACK = 'NO_AUDIO_TRACK',
  /** ffmpeg could not pull the audio track out. Nothing was charged. */
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  /** The transcription path refused or failed (credit, provider, no connector). */
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  /** auth-service could not state the plan: the paid step fails closed. */
  ENTITLEMENTS_UNAVAILABLE = 'ENTITLEMENTS_UNAVAILABLE',
}
