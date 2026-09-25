/**
 * Why a provider answered 200 but gave us no usable transcript. Read by
 * `classifyTranscriptionFailure` to decide whether the candidate walk may make
 * another call, and by the manager to pick the sentence the user reads.
 */
export enum TranscriptionResponseIssue {
  /** No text at all (or only whitespace). One retry on the same model per job, then the next candidate. */
  EMPTY = 'EMPTY',
  /** Every text part was a `thought: true` part — reasoning, no transcript. Treated like EMPTY. */
  THOUGHT_ONLY = 'THOUGHT_ONLY',
  /** `finishReason: MAX_TOKENS` — cut off at the granted ceiling. Next candidate; the same ceiling would cut again. */
  TRUNCATED = 'TRUNCATED',
  /** A safety/recitation/policy block (`finishReason` or `promptFeedback.blockReason`). Terminal. */
  BLOCKED = 'BLOCKED',
}
