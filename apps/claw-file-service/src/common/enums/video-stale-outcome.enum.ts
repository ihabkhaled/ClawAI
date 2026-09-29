/** What the stale-video recovery did with one stale placeholder (log only). */
export enum VideoStaleOutcome {
  /** The lock belongs to a job running in this process — left alone. */
  SKIPPED_LIVE_LOCK = 'SKIPPED_LIVE_LOCK',
  /** Dead lock (if any) cleared and the job re-queued. */
  REQUEUED = 'REQUEUED',
  /** Re-queued too often; ended FAILED (`PROCESSING_ERROR`). */
  FAILED_EXHAUSTED = 'FAILED_EXHAUSTED',
}
