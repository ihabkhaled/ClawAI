import type { ThreadGenerationStepOutcome, ThreadGenerationStepRoleKind } from '@claw/shared-types';

/** How often the owner's progress panel asks for the step list while a job runs. */
export const THREAD_PROGRESS_POLL_INTERVAL_MS = 3000;

/** Hard stop: about twenty minutes of polling, then the panel asks for a reload. */
export const THREAD_PROGRESS_MAX_POLLS = 400;

/** Job states after which nothing more will happen without an owner action. */
export const THREAD_PROGRESS_TERMINAL_STATUSES: readonly string[] = [
  'WAITING_FOR_REVIEW',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

/** Consecutive failed polls after which the panel stops asking and shows a reload hint. */
export const THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS = 5;

/** Integer micro-USD per USD, for the spend cap and spent-so-far figures. */
export const MICRO_PER_USD = 1_000_000;

export const MS_PER_SECOND = 1000;

export const SECONDS_PER_MINUTE = 60;

/** Job states the owner can retry. */
export const THREAD_PROGRESS_RETRYABLE_STATUSES: readonly string[] = ['FAILED', 'CANCELLED'];

/** The longest excerpt of a model's answer shown in one step. */
export const THREAD_EXCERPT_MAX_CHARS = 1200;

/** Longest safe error code the UI echoes back to the owner. */
export const THREAD_SAFE_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

/** Machine code from the service to the key under `chat.threadProgress.code` and `.hint`. */
export const THREAD_GENERATION_CODE_KEYS: Readonly<Record<string, string>> = {
  PAYG_CREDIT_EXHAUSTED: 'paygCreditExhausted',
  PROVIDER_UNAVAILABLE: 'providerUnavailable',
  PROVIDER_ERROR: 'providerError',
  PROVIDER_RATE_LIMITED: 'providerRateLimited',
  OUTPUT_INVALID: 'outputInvalid',
  CONSENSUS_NOT_REACHED: 'consensusNotReached',
  JUDGE_SCORE_LOW: 'judgeScoreLow',
  CRITIC_SCORE_LOW: 'criticScoreLow',
  FALLBACK_USED: 'fallbackUsed',
  CONTEXT_WINDOW_EXCEEDED: 'contextWindowExceeded',
  MODEL_CONTEXT_UNAVAILABLE: 'modelContextUnavailable',
  MODEL_CATALOG_UNREACHABLE: 'modelCatalogUnreachable',
  MODEL_CATALOG_REJECTED: 'modelCatalogRejected',
  CONTEXT_WINDOW_ASSUMED: 'contextWindowAssumed',
  RESEARCH_UNAVAILABLE: 'researchUnavailable',
  RESEARCH_FAILED: 'researchFailed',
  RESEARCH_EMPTY: 'researchEmpty',
  REVIEW_NOT_PASSED: 'reviewNotPassed',
  CITATION_INVALID: 'citationInvalid',
  CANCELLED: 'cancelled',
  GENERATION_FAILED: 'generationFailed',
  GENERATION_ATTEMPT_RETRY: 'generationAttemptRetry',
  GENERATION_WORKER_LOST: 'generationWorkerLost',
  LEASE_EXPIRED: 'leaseExpired',
  RESUMED_FROM_CHECKPOINT: 'resumedFromCheckpoint',
  GENERATION_ATTEMPT_TIMEOUT: 'generationAttemptTimeout',
  MODEL_IDLE_TIMEOUT: 'modelIdleTimeout',
  MODEL_HARD_CEILING: 'modelHardCeiling',
  MODEL_REASONED_NO_ANSWER: 'modelReasonedNoAnswer',
};

/**
 * Machine code on a refused start (ADR-174) to the key under `chat.threadProgress.startError`.
 * The service message is English for API clients; the owner reads this translated sentence.
 */
export const THREAD_START_ERROR_KEYS: Readonly<Record<string, string>> = {
  THREAD_GENERATION_NOT_PERMITTED: 'notPermitted',
  THREAD_GENERATION_NOT_IN_PLAN: 'notInPlan',
  MODEL_NOT_ALLOWED_FOR_PLAN: 'modelNotAllowedForPlan',
  THREAD_MODEL_UNKNOWN: 'modelUnknown',
  THREAD_SPEND_CAP_TOO_LOW: 'spendCapTooLow',
};

export const THREAD_STEP_OUTCOME_KEYS: Readonly<Record<ThreadGenerationStepOutcome, string>> = {
  STARTED: 'chat.threadProgress.outcomeStarted',
  SUCCEEDED: 'chat.threadProgress.outcomeSucceeded',
  FAILED: 'chat.threadProgress.outcomeFailed',
  RETRY: 'chat.threadProgress.outcomeRetry',
  FALLBACK: 'chat.threadProgress.outcomeFallback',
  SKIPPED: 'chat.threadProgress.outcomeSkipped',
};

export const THREAD_STEP_ROLE_KEYS: Readonly<Record<ThreadGenerationStepRoleKind, string>> = {
  AUTHOR: 'chat.threadProgress.roleAuthor',
  JUDGE: 'chat.threadProgress.roleJudge',
  CRITIC: 'chat.threadProgress.roleCritic',
  RESEARCH: 'chat.threadProgress.roleResearch',
  SYSTEM: 'chat.threadProgress.roleSystem',
};

/** Tone classes per outcome. Logical, theme-token colours only. */
export const THREAD_STEP_OUTCOME_TONES: Readonly<Record<ThreadGenerationStepOutcome, string>> = {
  STARTED: 'text-info',
  SUCCEEDED: 'text-success',
  FAILED: 'text-destructive',
  RETRY: 'text-warning',
  FALLBACK: 'text-warning',
  SKIPPED: 'text-muted-foreground',
};

/** Roles whose model the owner can change when retrying. */
export const THREAD_RETRY_EDITABLE_ROLE_KINDS: readonly string[] = ['AUTHOR', 'JUDGE', 'CRITIC'];

/** Terminal statuses that read better as a status chip than as a stage name. */
export const THREAD_STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  FAILED: 'chat.threadProgress.outcomeFailed',
  CANCELLED: 'chat.threadGenerationCancelled',
  WAITING_FOR_REVIEW: 'chat.threadStageReady',
};
