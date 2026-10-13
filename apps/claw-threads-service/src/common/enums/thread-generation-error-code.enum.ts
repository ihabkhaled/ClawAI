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
}
