/**
 * Bounded retry for the budget transactions that run at SERIALIZABLE isolation.
 *
 * Three to five authors reserve against the SAME budget row in the same
 * millisecond, so Postgres aborts all but one with a serialization failure
 * (Prisma P2034). That is a normal consequence of the isolation level, not an
 * error, and the loser simply runs again. The bound keeps a genuinely wedged
 * database from becoming an endless loop; the jitter keeps the losers from
 * colliding again in lock-step.
 */
export const THREAD_BUDGET_TX_MAX_ATTEMPTS = 8;
export const THREAD_BUDGET_TX_BASE_DELAY_MS = 20;
export const THREAD_BUDGET_TX_MAX_DELAY_MS = 400;

/** Every budget transaction runs SERIALIZABLE: two writers of one budget row cannot interleave. */
export const THREAD_BUDGET_TX_OPTIONS = { isolationLevel: 'Serializable' } as const;

/** Prisma codes that mean "run the transaction again". */
export const PRISMA_SERIALIZATION_FAILURE_CODE = 'P2034';
export const PRISMA_UNIQUE_VIOLATION_CODE = 'P2002';

/**
 * A budget older than this and still ACTIVE belongs to a job that died without
 * closing it (a failed enqueue, a crashed worker). Far above the longest job the
 * generation service can run, so a live job is never closed from under itself.
 */
export const THREAD_BUDGET_STALE_AFTER_MS = 12 * 60 * 60 * 1000;
export const THREAD_BUDGET_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
export const THREAD_BUDGET_SWEEP_BATCH_SIZE = 50;
export const THREAD_BUDGET_SWEEP_LOCK_KEY = 'lock:thread-job-budget-sweep';
export const THREAD_BUDGET_SWEEP_LOCK_TTL_SECONDS = 120;
/** Reason stored on the credit hold of a call released because its job was closed. */
export const THREAD_BUDGET_CALL_RELEASE_REASON = 'CANCELLED';
