import type { PlanFeature } from '@claw/shared-entitlements';

/** One US dollar in micro-USD, the unit of every spend cap. */
export const MICRO_USD_PER_USD = 1_000_000;

/**
 * The smallest spend cap a generation may be enqueued with: one US cent. A generation runs
 * research, three to five author drafts, a judge and a critic, so a cap below this cannot pay
 * for even one round and only produces a job that fails on its first model call. The same
 * floor applies to a retry (`MIN_THREAD_SPEND_CAP_USD`).
 */
export const MIN_THREAD_SPEND_CAP_MICRO_USD = 10_000;

export const MIN_THREAD_SPEND_CAP_USD = MIN_THREAD_SPEND_CAP_MICRO_USD / MICRO_USD_PER_USD;

/** connector-service route that lists the models the picker offers (exposed, active, chat). */
export const MODEL_CATALOG_PATH = '/api/v1/internal/connectors/public-catalog';

/** How long a read of the picker catalog is reused. Short, so a newly exposed model is accepted within seconds. */
export const MODEL_CATALOG_CACHE_TTL_MS = 30_000;

/** How long the model-catalog existence lookup may take before the enqueue fails closed. */
export const MODEL_CATALOG_LOOKUP_TIMEOUT_MS = 10_000;

/** Same body for a missing source thread and for another user's thread (owner-only visibility). */
export const SOURCE_THREAD_NOT_FOUND_MESSAGE = 'Source thread not found';

export const GENERATION_JOB_NOT_FOUND_MESSAGE = 'Generation job not found';

/** Request fields that name or trace a start but do not change what it asks for. */
export const FINGERPRINT_EXCLUDED_FIELDS: readonly string[] = ['idempotencyKey', 'correlationId'];

/** The three plan features every Thread generation reserves, with the words a person would use. */
export const THREAD_REQUIRED_FEATURES: ReadonlyArray<{ feature: PlanFeature; label: string }> = [
  { feature: 'allowResearchMode', label: 'web research' },
  { feature: 'allowJudgeMode', label: 'Judge review' },
  { feature: 'allowCriticReview', label: 'Critic review' },
];
