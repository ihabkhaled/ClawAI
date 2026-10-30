/** routing-service route that answers many models' cost classes in one call (service token). */
export const MODEL_COST_CLASSES_PATH = '/api/v1/internal/router-models/costs/classes';

/** The most pairs routing-service accepts in one request. */
export const MODEL_COST_CLASSES_BATCH_SIZE = 300;

/** How long one answer is reused. Prices change rarely; a plan edit does not depend on it. */
export const MODEL_COST_CLASS_CACHE_TTL_MS = 60_000;

/** Most answers kept; the cache is cleared when it would grow past this. */
export const MODEL_COST_CLASS_CACHE_MAX_ENTRIES = 2_000;

/** How long one routing-service call may take before the lookup fails closed. */
export const MODEL_COST_CLASS_TIMEOUT_MS = 5_000;
