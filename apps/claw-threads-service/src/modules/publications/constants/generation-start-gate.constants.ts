/**
 * The most start or retry requests from one owner that may wait behind each other at once.
 * Requests of one owner run one at a time (so the active-generation cap and the idempotency
 * lookup are exact); a client that floods past this gets a 429 instead of an unbounded queue.
 */
export const MAX_QUEUED_OWNER_REQUESTS = 8;
