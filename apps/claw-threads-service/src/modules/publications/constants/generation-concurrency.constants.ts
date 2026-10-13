/**
 * The most Thread generations one owner may have queued or running at once (ADR-176).
 * A generation spends real money and holds a worker slot for minutes; without a cap one
 * account could queue dozens and starve everyone else. A finished, failed or cancelled
 * generation does not count. Raise it only together with the worker slot count.
 */
export const MAX_ACTIVE_GENERATIONS_PER_OWNER = 3;

/**
 * How many of the owner's newest draft publications are checked against the generation
 * service when counting active generations. Only drafts can be active, and an owner cannot
 * have more than the cap active, so a window this size always reaches them in practice.
 */
export const ACTIVE_GENERATION_SCAN_LIMIT = 25;

/** Attempts for a Serializable transaction that lost a write conflict (Prisma P2034). */
export const SERIALIZATION_RETRY_ATTEMPTS = 4;

/** Base wait between serialization retries; doubled each attempt, never more than a second in total. */
export const SERIALIZATION_RETRY_BASE_DELAY_MS = 20;

/** The most jobs one orphan-repair call may look at. */
export const ORPHAN_REPAIR_MAX_JOBS = 50;
