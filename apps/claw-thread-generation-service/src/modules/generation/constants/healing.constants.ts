import { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';

/** Healing attempts one role call may make (every format retry, backoff retry and model swap counts). */
export const MAX_HEAL_ATTEMPTS_PER_ROLE = 6;
/** Healing attempts all roles of one job attempt may make together. */
export const MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT = 24;
/** A healing attempt only starts while the job has spent less than this share of its cap. */
export const HEAL_SPEND_CEILING_PERCENT = 85;
export const PERCENT_DIVISOR = 100;

export const HEAL_BACKOFF_BASE_MS = 2_000;
export const HEAL_BACKOFF_MAX_MS = 30_000;
/** Longest Retry-After the service waits for; a longer one means: use another model. */
export const HEAL_RETRY_AFTER_MAX_MS = 30_000;
export const HEAL_JITTER_RATIO = 0.25;

/** Never lower the output limit below this many tokens when a provider rejects the request. */
export const MIN_LOWERED_OUTPUT_TOKENS = 2_048;
export const LOWERED_OUTPUT_FACTOR = 0.5;
/** A compact retry asks for this share of the article length. */
export const COMPACT_LENGTH_PERCENT = 60;

/** Times the research service is called before the attempt fails (one wait between). */
export const RESEARCH_ATTEMPTS = 2;

/** Extra models (beyond a role's own backups) one role may try. */
export const MAX_POOL_CANDIDATES_PER_ROLE = 4;
/** Samples a model needs in the recent step log before its success rate re-orders the pool. */
export const MIN_HEALTH_SAMPLES = 3;
/** Success rates are compared as whole numbers out of this scale. */
export const HEALTH_RATE_SCALE = 1000;
export const NO_WAIT_MS = 0;
export const HEALTH_WINDOW_MS = 60 * 60_000;
export const HEALTH_CACHE_TTL_MS = 60_000;

/** Share of the source messages kept when the source is shrunk, per shrink step. */
export const SHRINK_ELLIPSIS = '\u2026';
export const SHRINK_KEEP_RATIO = 0.5;
export const SHRINK_MESSAGE_MAX_CHARS = 1_500;
export const SHRINK_MIN_MESSAGES = 4;
/** Mirrors chat-service's internal-generate userPrompt limit. */
export const CHAT_GATEWAY_USER_PROMPT_MAX_CHARS = 200_000;
/** Bound source compaction even when the fixed evidence or draft cannot fit. */
export const MAX_PROACTIVE_SHRINK_LEVEL = 10;

/** Replies longer than this are never sent to a repair pass. */
export const JSON_REPAIR_INPUT_MAX_CHARS = 60_000;

/** What a failed model is asked again with, in order, before the role moves to another model. */
export const ON_MODEL_LADDERS: ReadonlyMap<ThreadFailureClass, readonly ThreadHealingStrategy[]> =
  new Map([
    [ThreadFailureClass.PROVIDER_RATE_LIMITED, [ThreadHealingStrategy.BACKOFF_RETRY]],
    [ThreadFailureClass.PROVIDER_UNAVAILABLE, [ThreadHealingStrategy.BACKOFF_RETRY]],
    [ThreadFailureClass.NETWORK, [ThreadHealingStrategy.BACKOFF_RETRY]],
    // A bare 400 (AI Horde, 2026-10-14): drop what can be dropped, then shrink the prompt, then swap.
    [
      ThreadFailureClass.PROVIDER_REJECTED,
      [ThreadHealingStrategy.LOWER_OUTPUT_LIMIT, ThreadHealingStrategy.SHRINK_SOURCE],
    ],
    [ThreadFailureClass.CAP_TOO_LOW, [ThreadHealingStrategy.LOWER_OUTPUT_LIMIT]],
    [ThreadFailureClass.EMPTY_OUTPUT, [ThreadHealingStrategy.STRICT_PROMPT]],
    [
      ThreadFailureClass.TRUNCATED_OUTPUT,
      [ThreadHealingStrategy.RAISE_OUTPUT_LIMIT, ThreadHealingStrategy.COMPACT_OUTPUT],
    ],
    [
      ThreadFailureClass.INVALID_JSON,
      [ThreadHealingStrategy.STRICT_PROMPT, ThreadHealingStrategy.JSON_REPAIR],
    ],
    [
      ThreadFailureClass.WRONG_SHAPE,
      [ThreadHealingStrategy.STRICT_PROMPT, ThreadHealingStrategy.JSON_REPAIR],
    ],
    [
      ThreadFailureClass.CITATION_RULE,
      [ThreadHealingStrategy.STRICT_PROMPT, ThreadHealingStrategy.JSON_REPAIR],
    ],
    [ThreadFailureClass.CONTEXT_OVERFLOW, [ThreadHealingStrategy.SHRINK_SOURCE]],
  ]);

/** Failures of the provider as a whole: another model of the same provider would fail the same way. */
export const PROVIDER_WIDE_CLASSES: ReadonlySet<ThreadFailureClass> = new Set([
  ThreadFailureClass.PROVIDER_RATE_LIMITED,
  ThreadFailureClass.PROVIDER_UNAVAILABLE,
  ThreadFailureClass.PROVIDER_TIMEOUT,
  ThreadFailureClass.NETWORK,
  ThreadFailureClass.PROVIDER_CREDIT,
]);

/** Failures that are the model's own: it is not asked again by a later attempt of the same job. */
export const MODEL_SPECIFIC_CLASSES: ReadonlySet<ThreadFailureClass> = new Set([
  ThreadFailureClass.PROVIDER_REJECTED,
  ThreadFailureClass.EMPTY_OUTPUT,
  ThreadFailureClass.TRUNCATED_OUTPUT,
  ThreadFailureClass.INVALID_JSON,
  ThreadFailureClass.WRONG_SHAPE,
  ThreadFailureClass.CITATION_RULE,
  ThreadFailureClass.CONTEXT_OVERFLOW,
  ThreadFailureClass.PRICING_UNAVAILABLE,
]);

/** Step codes of the swaps and the notices the ladder adds to the step log. */
export const HEAL_STOPPED_SPEND_CODE = 'HEAL_STOPPED_SPEND_CAP';
export const HEAL_STOPPED_BUDGET_CODE = 'HEAL_STOPPED_ATTEMPT_BUDGET';
export const HEAL_STOPPED_OWNER_CODE = 'HEAL_STOPPED_OWNER_ACTION';
export const HEAL_SOURCE_SHRUNK_NOTE = 'HEAL_SOURCE_SHRUNK';
