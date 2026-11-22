import { LiveRunStatus } from '../../../generated/prisma';

/** Runs a worker may still be writing to: their data is never deleted from under it. */
export const RUN_STATUSES_IN_USE: LiveRunStatus[] = [
  LiveRunStatus.PENDING,
  LiveRunStatus.ACTIVE,
  LiveRunStatus.DELAYED,
  LiveRunStatus.STOPPING,
];

/** Redis replay list of a run's SSE events (architecture section 9). */
export const REPLAY_KEY_PREFIX = 'claw:live:replay:';

/** Finished runs whose data may be swept once nothing references them. */
export const RUN_STATUSES_FINISHED: LiveRunStatus[] = [
  LiveRunStatus.STOPPED,
  LiveRunStatus.ENDED,
  LiveRunStatus.FAILED,
];

/**
 * The orphan sweep: a history deletion that races a run still STOPPING skips that run, and nothing
 * else would ever revisit it. Every 5 minutes one replica (Redis lock, owner token) tombstones up to
 * ORPHAN_SWEEP_BATCH finished runs that no session and no coverage references.
 */
export const ORPHAN_SWEEP_INTERVAL_MS = 300_000;
export const ORPHAN_SWEEP_BATCH = 20;
export const ORPHAN_SWEEP_LOCK_KEY = 'live:lock:orphan-run-sweep';
export const ORPHAN_SWEEP_LOCK_TTL_MS = 120_000;
