/**
 * Why one transcription provider call failed, as far as the candidate walk
 * cares: it decides whether the NEXT call may happen and where it goes.
 *
 * A 429 and a model refusal both mean the provider did not process the audio,
 * so nothing was spent and trying elsewhere is safe. Everything else is
 * TERMINAL: a 5xx or a dropped connection may have been processed, and a
 * second paid call for it would be a guess.
 */
export enum TranscriptionFailureKind {
  /** This model refuses audio (the modality 400) or does not exist (404). Try the next model. */
  MODEL_REJECTED = 'MODEL_REJECTED',
  /** A transient 429. One short backoff retry per job, then the next provider. */
  RATE_LIMITED = 'RATE_LIMITED',
  /** OpenAI `insufficient_quota`: the key has no credit. Never call that provider again this job. */
  QUOTA_EXHAUSTED = 'QUOTA_EXHAUSTED',
  /** Anything else. The walk stops here. */
  TERMINAL = 'TERMINAL',
}
