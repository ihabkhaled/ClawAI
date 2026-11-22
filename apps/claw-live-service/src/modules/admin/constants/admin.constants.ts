import { LiveRunStatus } from '../../../generated/prisma';

/** Runs that count as live: they hold a worker or are about to. */
export const LIVE_RUN_STATUSES: LiveRunStatus[] = [
  LiveRunStatus.PENDING,
  LiveRunStatus.ACTIVE,
  LiveRunStatus.DELAYED,
  LiveRunStatus.STOPPING,
];

/** Statuses an emergency stop moves to STOPPING. */
export const STOPPABLE_RUN_STATUSES: LiveRunStatus[] = [
  LiveRunStatus.PENDING,
  LiveRunStatus.ACTIVE,
  LiveRunStatus.DELAYED,
];

export const OVERVIEW_ACTIVE_RUNS_LIMIT = 200;
export const SECONDS_PER_HOUR = 3600;
export const DAYS_PER_MONTH = 30;
export const MS_PER_DAY = 86_400_000;
export const STAGE_STT = 'STT';
export const STAGE_SUMMARY = 'SUMMARY';
export const STAGE_TRANSLATION = 'TRANSLATION';
export const STAGE_VISION = 'VISION';
