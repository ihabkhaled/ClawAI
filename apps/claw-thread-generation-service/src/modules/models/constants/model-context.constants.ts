/**
 * Window assumed when neither routing-service nor the shared table knows a model's
 * context window. Mirrors chat-service's conservative default so one unenriched catalog
 * row no longer stops a whole generation (ADR-173). The prompt is still never truncated:
 * it is checked against this number and the role fails only when it does not fit.
 */
export const THREADS_ASSUMED_WINDOW_TOKENS = 32_768;

/** How long a looked-up window is reused, so many roles and rounds share one catalog call. */
export const MODEL_WINDOW_CACHE_TTL_MS = 300_000;

/** Upper bound on cached provider/model pairs; the oldest entry is dropped first. */
export const MODEL_WINDOW_CACHE_MAX_ENTRIES = 200;

export const MODEL_CATALOG_TIMEOUT_MS = 10_000;

/** Messages written here are mapped to step codes by STEP_MESSAGE_CODES; keep them in sync. */
export const MODEL_CATALOG_UNREACHABLE_MESSAGE = 'Model catalog is unreachable';
export const MODEL_CATALOG_REJECTED_MESSAGE = 'Model catalog rejected the lookup';
export const CONTEXT_WINDOW_EXCEEDED_MESSAGE = 'Complete role context exceeds the model window';
export const CONTEXT_WINDOW_ASSUMED_EXCEEDED_MESSAGE =
  'Complete role context exceeds the assumed model window';

/** Catalog statuses that are worth retrying; any other non-2xx is a configuration fault. */
export const MODEL_CATALOG_TRANSIENT_STATUSES: readonly number[] = [408, 425, 429];
export const HTTP_SERVER_ERROR_MIN = 500;

/** Path of connector-service's service-token catalog: the exposed-chat-model set the picker shows. */
export const CONNECTOR_CATALOG_PATH = '/api/v1/internal/connectors/public-catalog';

/** The catalog is a nice-to-have first source, so it must never hold a role up for long. */
export const CONNECTOR_CATALOG_TIMEOUT_MS = 4_000;

/** After a failed catalog read the router is used directly for this long, so a down connector costs one wait. */
export const CONNECTOR_CATALOG_RETRY_AFTER_FAILURE_MS = 30_000;
