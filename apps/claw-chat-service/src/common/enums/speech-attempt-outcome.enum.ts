/**
 * What happened to one TTS_VOICE candidate (multimodal batch 9). Logged per
 * attempt; decides whether the walk moves on (rule 37 item 18).
 */
export enum SpeechAttemptOutcome {
  SUCCEEDED = 'SUCCEEDED',
  /** No connector key for the provider — skipped before any hold. */
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  /** The provider rejected the request or was unavailable; hold released, next candidate. */
  FAILED = 'FAILED',
  /** Credit refused, clamped or unverifiable — terminal, never a reason to try the next. */
  REFUSED = 'REFUSED',
  /** Past the candidate's deadline — hold released, terminal (bounded latency). */
  TIMED_OUT = 'TIMED_OUT',
}
