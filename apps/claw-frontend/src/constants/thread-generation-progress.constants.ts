import type { ThreadGenerationStepOutcome, ThreadGenerationStepRoleKind } from '@claw/shared-types';

import { ThreadGenerationJobStatus } from '@/enums/thread-generation-job-status.enum';

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
  PAYG_CAP_TOO_LOW: 'paygCapTooLow',
  PAYG_PRICE_UNAVAILABLE: 'paygPriceUnavailable',
  CLOUD_PROVIDER_UNAVAILABLE: 'cloudProviderUnavailable',
  PROVIDER_UNAVAILABLE: 'providerUnavailable',
  PROVIDER_ERROR: 'providerError',
  PROVIDER_RATE_LIMITED: 'providerRateLimited',
  OUTPUT_INVALID: 'outputInvalid',
  CONSENSUS_NOT_REACHED: 'consensusNotReached',
  JUDGE_SCORE_LOW: 'judgeScoreLow',
  CRITIC_SCORE_LOW: 'criticScoreLow',
  FALLBACK_USED: 'fallbackUsed',
  FALLBACK_SKIPPED_SAME_PROVIDER: 'fallbackSkippedSameProvider',
  CONTEXT_WINDOW_EXCEEDED: 'contextWindowExceeded',
  MODEL_CONTEXT_UNAVAILABLE: 'modelContextUnavailable',
  MODEL_CATALOG_UNREACHABLE: 'modelCatalogUnreachable',
  MODEL_CATALOG_REJECTED: 'modelCatalogRejected',
  CONTEXT_WINDOW_ASSUMED: 'contextWindowAssumed',
  RESEARCH_UNAVAILABLE: 'researchUnavailable',
  RESEARCH_FAILED: 'researchFailed',
  RESEARCH_EMPTY: 'researchEmpty',
  RESEARCH_QUERY: 'researchQuery',
  RESEARCH_QUERY_FAILED: 'researchQueryFailed',
  RESEARCH_QUERY_SPEND_CAP: 'researchQuerySpendCap',
  REVIEW_NOT_PASSED: 'reviewNotPassed',
  REVIEWERS_NOT_INDEPENDENT: 'reviewersNotIndependent',
  CITATION_INVALID: 'citationInvalid',
  CANCELLED: 'cancelled',
  GENERATION_FAILED: 'generationFailed',
  GENERATION_ATTEMPT_RETRY: 'generationAttemptRetry',
  GENERATION_WORKER_LOST: 'generationWorkerLost',
  LEASE_EXPIRED: 'leaseExpired',
  RESUMED_FROM_CHECKPOINT: 'resumedFromCheckpoint',
  GENERATION_ATTEMPT_TIMEOUT: 'generationAttemptTimeout',
  QUEUE_EXPIRED: 'queueExpired',
  MODEL_IDLE_TIMEOUT: 'modelIdleTimeout',
  MODEL_HARD_CEILING: 'modelHardCeiling',
  MODEL_REASONED_NO_ANSWER: 'modelReasonedNoAnswer',
  // Healing steps (ADR-181): what the service changed before it asked again.
  HEAL_BACKOFF_RETRY: 'healBackoffRetry',
  HEAL_STRICT_PROMPT: 'healStrictPrompt',
  HEAL_JSON_REPAIR: 'healJsonRepair',
  HEAL_RAISE_OUTPUT_LIMIT: 'healRaiseOutputLimit',
  HEAL_COMPACT_OUTPUT: 'healCompactOutput',
  HEAL_LOWER_OUTPUT_LIMIT: 'healLowerOutputLimit',
  HEAL_SHRINK_SOURCE: 'healShrinkSource',
  HEAL_CROSS_PROVIDER: 'healCrossProvider',
  HEAL_SAFE_DEFAULT: 'healSafeDefault',
  HEAL_STOPPED_SPEND_CAP: 'healStoppedSpendCap',
  HEAL_STOPPED_ATTEMPT_BUDGET: 'healStoppedAttemptBudget',
  HEAL_STOPPED_OWNER_ACTION: 'healStoppedOwnerAction',
  PROVIDER_REQUEST_TOO_LARGE: 'providerRequestTooLarge',
  PROVIDER_CREDIT_EXHAUSTED: 'providerCreditExhausted',
  PAYG_PRICING_UNAVAILABLE: 'paygPricingUnavailable',
  CLOUD_PROVIDER_REQUEST_FAILED: 'cloudProviderRequestFailed',
  CLOUD_PROVIDER_EMPTY_RESPONSE: 'cloudProviderEmptyResponse',
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
  THREAD_AUTHOR_COUNT_INVALID: 'authorCountInvalid',
  THREAD_LOCALE_INVALID: 'localeInvalid',
  THREAD_PUBLICATION_TYPE_INVALID: 'publicationTypeInvalid',
  THREAD_REQUEST_INVALID: 'requestInvalid',
  THREAD_GENERATION_ALLOWANCE_UNAVAILABLE: 'allowanceUnavailable',
  THREAD_GENERATION_TOO_MANY_ACTIVE: 'tooManyActive',
  THREAD_IDEMPOTENCY_KEY_REUSED: 'idempotencyKeyReused',
  ACCEPTED_GAP_NOT_A_BLOCKER: 'acceptedGapNotABlocker',
  THREAD_GENERATION_NOT_CANCELLABLE: 'notCancellable',
  THREAD_PUBLICATION_NOT_PUBLISHED: 'notPublished',
  THREAD_TOPIC_INVALID: 'topicInvalid',
  THREAD_TEXT_INVALID: 'textInvalid',
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

/**
 * Tone classes per outcome. Light-theme shades are picked for 4.5:1 on a white or tinted card
 * (the token colours measured 2.1 to 3.6:1 there); dark mode keeps the brighter tokens.
 */
export const THREAD_STEP_OUTCOME_TONES: Readonly<Record<ThreadGenerationStepOutcome, string>> = {
  STARTED: 'text-blue-700 dark:text-info',
  SUCCEEDED: 'text-green-700 dark:text-success',
  FAILED: 'text-red-800 dark:text-destructive',
  RETRY: 'text-amber-700 dark:text-warning',
  FALLBACK: 'text-amber-700 dark:text-warning',
  SKIPPED: 'text-muted-foreground',
};

/** Roles whose model the owner can change when retrying. */
export const THREAD_RETRY_EDITABLE_ROLE_KINDS: readonly string[] = ['AUTHOR', 'JUDGE', 'CRITIC'];

/** Statuses that read better as a status chip than as a stage name (a queued job has no stage yet). */
export const THREAD_STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  [ThreadGenerationJobStatus.Queued]: 'chat.threadProgress.statusQueued',
  FAILED: 'chat.threadProgress.outcomeFailed',
  CANCELLED: 'chat.threadGenerationCancelled',
  WAITING_FOR_REVIEW: 'chat.threadStageReady',
};

/** How close to the bottom of the scrolling area the reader must be to resume following, in pixels. */
export const THREAD_FOLLOW_BOTTOM_THRESHOLD_PX = 24;

/** Keys that mean the reader is scrolling up on purpose, so the page stops following. */
export const THREAD_FOLLOW_STOP_KEYS: readonly string[] = ['PageUp', 'ArrowUp', 'Home'];
