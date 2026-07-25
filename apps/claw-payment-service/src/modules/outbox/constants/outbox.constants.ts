// How many outbox rows one drain claims. Small enough that a slow broker does
// not hold a claim open across a whole poll interval, large enough that a burst
// of activations drains in a few ticks rather than one row at a time.
export const OUTBOX_DRAIN_BATCH_SIZE = 50;

// Exponential backoff, capped. A broker outage must not become a hot loop
// hammering a dead connection, and the cap keeps recovery prompt once it
// returns.
export const OUTBOX_RETRY_BASE_DELAY_MS = 1_000;
export const OUTBOX_RETRY_MAX_DELAY_MS = 60_000;
