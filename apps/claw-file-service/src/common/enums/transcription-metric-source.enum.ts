/** Where the audio of a transcription job came from (metrics label). */
export enum TranscriptionMetricSource {
  /** A voice note or audio file the user uploaded. */
  UPLOAD = 'UPLOAD',
  /** A video's extracted audio track. */
  VIDEO_AUDIO = 'VIDEO_AUDIO',
}
