import { LogLevel } from '@/enums';

export const LOG_MAX_ENTRIES = 500;

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  [LogLevel.INFO]:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [LogLevel.WARN]:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [LogLevel.ERROR]:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

export const SERVER_LOG_STATS_TOP_SERVICES_LIMIT = 5;

export const CLIENT_LOG_STATS_TOP_ITEMS_LIMIT = 5;

export const LOG_SENSITIVE_KEYS: ReadonlyArray<string> = [
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'authorization',
] as const;

// ─── Client telemetry transport ────────────────────────────────────────────
//
// The logger used to hold entries for five seconds and then issue one HTTP
// request per entry in a loop. The buffer was never a batch — it was a delay
// that guaranteed the requests left together, which is what turned a page
// mount into a burst of twenty-odd calls within the same millisecond. Each one
// also spent a rate-limit unit and a Mongo write.

/** How long entries accumulate before one request carries all of them. */
export const CLIENT_LOG_FLUSH_INTERVAL_MS = 5_000;

/**
 * Most events per request. MUST stay at or below the server's
 * `CLIENT_LOG_BATCH_MAX_EVENTS`, or a large flush is rejected whole.
 */
export const CLIENT_LOG_MAX_BATCH_EVENTS = 100;

/**
 * Hard ceiling on the buffer between flushes.
 *
 * An error loop can produce events faster than the flush interval clears them.
 * Dropping the oldest is better than growing without bound and better than
 * dropping the newest, which is usually the interesting one.
 */
export const CLIENT_LOG_MAX_BUFFER_EVENTS = 500;

/**
 * Identical events inside one buffer window collapse to a single event with an
 * occurrence count, rather than N copies. A render loop or a retrying query
 * produces the same line repeatedly, and N copies of it carry no more
 * information than one plus a number.
 */
export const CLIENT_LOG_OCCURRENCES_KEY = 'occurrences';

/**
 * Ordering for the severity gate. A bare string enum cannot be compared, which
 * is why there was no gate at all and every debug line reached production.
 */
export const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 10,
  [LogLevel.INFO]: 20,
  [LogLevel.WARN]: 30,
  [LogLevel.ERROR]: 40,
};

/**
 * The lowest level that reaches the network.
 *
 * Debug lines sit inside `queryFn`s, so they fire on every mount, refetch and
 * invalidation — 21% of the call sites and the majority of the volume. They are
 * useful locally and noise in production. The in-memory store keeps every
 * level regardless, so the developer log view is unaffected.
 */
export const CLIENT_LOG_MIN_TRANSPORT_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

/**
 * How many times a failed `/client-logs/batch` request retries before the
 * batch is given up on.
 *
 * ADR-089 shipped the batch endpoint with `.catch(() => {})` and named this
 * deliberately deferred: "nothing samples today, and a failed flush is
 * dropped rather than retried." A dropped batch on a transient blip is a real
 * loss regardless of overall volume, so this closes that half. Sampling stays
 * deferred — its own trigger, telemetry volume rising, has not been observed.
 */
export const CLIENT_LOG_MAX_RETRY_ATTEMPTS = 3;

/** Backoff base for a retried batch: doubles each attempt (2s, 4s, 8s). */
export const CLIENT_LOG_RETRY_BASE_MS = 2_000;
