/**
 * Machine codes the Threads API returns when it refuses to start a generation. The frontend
 * and API clients branch on these; the message next to each one is plain text for people.
 */
export enum ThreadGenerationErrorCode {
  /** The account's role lacks the Thread generation permission. */
  NOT_PERMITTED = 'THREAD_GENERATION_NOT_PERMITTED',
  /** The plan lacks a feature a generation needs (web research, Judge or Critic review). */
  NOT_IN_PLAN = 'THREAD_GENERATION_NOT_IN_PLAN',
  /** A role names a model the plan does not include. Same code chat uses for the same refusal. */
  MODEL_NOT_ALLOWED_FOR_PLAN = 'MODEL_NOT_ALLOWED_FOR_PLAN',
  /** A role names a provider/model pair that is not in the model catalog. */
  MODEL_UNKNOWN = 'THREAD_MODEL_UNKNOWN',
  /** The spend cap is below the documented minimum. */
  SPEND_CAP_TOO_LOW = 'THREAD_SPEND_CAP_TOO_LOW',
  /** The plan has Thread generation, but its allowance is used up or held by a running generation. */
  ALLOWANCE_UNAVAILABLE = 'THREAD_GENERATION_ALLOWANCE_UNAVAILABLE',
  /** The owner already has the maximum number of generations running at once. */
  TOO_MANY_ACTIVE = 'THREAD_GENERATION_TOO_MANY_ACTIVE',
  /** The idempotency key was already used by this owner for a different request. */
  IDEMPOTENCY_KEY_REUSED = 'THREAD_IDEMPOTENCY_KEY_REUSED',
  /** Cancel was asked for a generation that is not running or queued. */
  NOT_CANCELLABLE = 'THREAD_GENERATION_NOT_CANCELLABLE',
  /** Unpublish was asked for a publication that was never published. */
  NOT_PUBLISHED = 'THREAD_PUBLICATION_NOT_PUBLISHED',
  /** The topic is empty after trimming or holds a character the stores cannot keep. */
  TOPIC_INVALID = 'THREAD_TOPIC_INVALID',
  /** A request text field holds a NUL byte or a lone surrogate. */
  TEXT_INVALID = 'THREAD_TEXT_INVALID',
  /** The author count is outside the allowed three to five. */
  AUTHOR_COUNT_INVALID = 'THREAD_AUTHOR_COUNT_INVALID',
  /** The content locale is not one the platform supports. */
  LOCALE_INVALID = 'THREAD_LOCALE_INVALID',
  /** The publication type is not one the platform supports. */
  PUBLICATION_TYPE_INVALID = 'THREAD_PUBLICATION_TYPE_INVALID',
  /** Any other start or retry field that failed validation (missing, wrong type, too long). */
  REQUEST_INVALID = 'THREAD_REQUEST_INVALID',
}
