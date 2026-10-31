/** Seconds-level bounds of the owner progress stream (ADR-201). All limits are per service replica. */

/** How often the shared watcher asks the generation service while the job is moving. */
export const PROGRESS_STREAM_POLL_FAST_MS = 400;

/** The slower beat once nothing has changed for `PROGRESS_STREAM_IDLE_AFTER_MS` (a long model call). */
export const PROGRESS_STREAM_POLL_IDLE_MS = 1000;

export const PROGRESS_STREAM_IDLE_AFTER_MS = 20_000;

/** Back-off between failed upstream reads, doubled each time up to the cap. */
export const PROGRESS_STREAM_ERROR_BACKOFF_MS = 1000;
export const PROGRESS_STREAM_ERROR_BACKOFF_MAX_MS = 8000;

/** Consecutive failed upstream reads after which the stream ends with an `error` event. */
export const PROGRESS_STREAM_MAX_UPSTREAM_FAILURES = 5;

export const PROGRESS_STREAM_HEARTBEAT_MS = 15_000;

/** A stream is closed (with a `reconnect` event) after this long, so a revoked session cannot outlive it. */
export const PROGRESS_STREAM_MAX_LIFETIME_MS = 10 * 60_000;

export const PROGRESS_STREAM_MAX_PER_USER = 6;
export const PROGRESS_STREAM_MAX_PER_PUBLICATION = 3;

/** Job states after which nothing more happens without an owner action; the stream ends there. */
export const PROGRESS_STREAM_TERMINAL_STATUSES: readonly string[] = [
  'WAITING_FOR_REVIEW',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

export const PROGRESS_STREAM_TOO_MANY_MESSAGE = 'Too many open progress streams';

/** How long a backed-up reader waits before it is offered the newest snapshot again. */
export const PROGRESS_STREAM_BACKPRESSURE_RETRY_MS = 500;
