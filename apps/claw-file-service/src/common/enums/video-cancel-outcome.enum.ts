/** What a cancel did, in the `videoCancel … outcome=` log line. */
export enum VideoCancelOutcome {
  /** The job stopped, or the route recorded the cancelled result. */
  CANCELLED = 'CANCELLED',
  /** Nothing to cancel: not a video, or not processing any more. */
  NOOP = 'NOOP',
}
