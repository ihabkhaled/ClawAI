/** How a transcription of DERIVED audio (a video's audio track) ended. */
export enum DerivedTranscriptionStatus {
  TRANSCRIBED = 'TRANSCRIBED',
  /** Refused (credit, no connector, too large) or failed at the provider. */
  FAILED = 'FAILED',
}
