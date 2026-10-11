const MS_PER_MINUTE = 60_000;

/** How often every keyed connector's model list is re-synced. */
export const MODEL_SYNC_INTERVAL_MS = 6 * 60 * MS_PER_MINUTE;

/** Upper bound of the random delay added to each wait so replicas do not sync in lockstep. */
export const MODEL_SYNC_MAX_JITTER_MS = 10 * MS_PER_MINUTE;

/** Wait before the first scheduled run after boot (jitter is added on top). */
export const MODEL_SYNC_INITIAL_DELAY_MS = 3 * MS_PER_MINUTE;
