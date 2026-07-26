// How many outbox rows one drain claims. Small enough that a slow broker does
// not hold a claim open across a whole poll interval, large enough that a burst
// of activations drains in a few ticks rather than one row at a time.
export const OUTBOX_DRAIN_BATCH_SIZE = 50;
export const OUTBOX_DRAIN_JOB_NAME = 'payment.outbox.drain';
export const OUTBOX_DRAIN_LOCK_KEY = 'locks:payment:outbox-drain';
// One 50-row batch has a 240-second operational budget. The extra minute keeps
// healthy replicas mutually exclusive while still allowing crash recovery.
export const OUTBOX_DRAIN_LOCK_TTL_SECONDS = 300;

// Exponential backoff, capped. A broker outage must not become a hot loop
// hammering a dead connection, and the cap keeps recovery prompt once it
// returns.
export const OUTBOX_RETRY_BASE_DELAY_MS = 1_000;
export const OUTBOX_RETRY_MAX_DELAY_MS = 60_000;
