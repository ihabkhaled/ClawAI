/** How a transcription of DERIVED audio (a video's audio track) ended. */
export enum DerivedTranscriptionStatus {
  TRANSCRIBED = 'TRANSCRIBED',
  /** Refused (credit, no connector, too large) or failed at the provider. */
  FAILED = 'FAILED',
  /** The video job was cancelled; any hold was released with reason CANCELLED. */
  CANCELLED = 'CANCELLED',
}
