/** How a video job ended, as the metrics count it (pack §67). */
export enum VideoProcessingOutcome {
  /** The timestamped document landed with a transcript. */
  COMPLETED = 'COMPLETED',
  /** The track was silent (volumedetect): document without a transcript, nothing charged. */
  NO_SPEECH = 'NO_SPEECH',
  /** The video has no audio track. */
  NO_AUDIO = 'NO_AUDIO',
  /** The document landed, but its audio could not be extracted or transcribed. */
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  /** The job failed (unreadable, over the plan limit, processing error). */
  FAILED = 'FAILED',
  /** The owner cancelled it. */
  CANCELLED = 'CANCELLED',
}
