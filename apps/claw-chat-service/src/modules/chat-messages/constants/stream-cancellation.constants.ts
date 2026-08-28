/**
 * Cross-replica cancellation for in-flight model runs.
 *
 * The Stop button posts to whichever replica nginx picks, but the run — and the
 * AbortController wired into its provider connection — lives on whichever
 * replica consumed the RabbitMQ message. Without a broadcast, Stop lands on the
 * wrong instance three times in four and silently does nothing: the endpoint
 * returns, the spinner clears, and the model keeps generating and keeps being
 * billed.
 */

/** Broadcast channel. Every replica listens and aborts its own run if it has one. */
export const STREAM_CANCEL_CHANNEL = 'claw:chat:cancel';

/**
 * Marks a run as in flight, so `cancel` can answer "was there anything to stop"
 * without asking every replica.
 *
 * Deleting this key IS the answer: `DEL` returns 1 only for the caller that
 * actually removed it, so two concurrent Stops cannot both report success.
 */
export const STREAM_CANCEL_ACTIVE_KEY_PREFIX = 'claw:chat:run:';

/**
 * Ceiling on how long a run may be considered in flight.
 *
 * Exists for the replica that dies mid-run: `release` never happens, and
 * without an expiry the key would advertise a run that no process is executing
 * for the rest of the deployment's life. An hour is far longer than any real
 * run, so it never truncates a live one.
 */
export const STREAM_CANCEL_ACTIVE_TTL_SECONDS = 3600;
