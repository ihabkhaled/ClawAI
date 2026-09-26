/**
 * One transcription provider call as the metrics count it (pack §67). Folded
 * from `TranscriptionAttemptStatus` and `TranscriptionFailureKind`: a model
 * refusal, an exhausted quota, a cut-off answer and a terminal error are all
 * FAILED; a credit refusal (no provider call) is REFUSED.
 */
export enum TranscriptionMetricOutcome {
  SUCCESS = 'SUCCESS',
  EMPTY = 'EMPTY',
  REFUSED = 'REFUSED',
  RATE_LIMITED = 'RATE_LIMITED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
