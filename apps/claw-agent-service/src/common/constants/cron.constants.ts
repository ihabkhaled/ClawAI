import type { CronFieldRange } from '../types/cron.types';

/** One or two digits: a cron field never carries a larger number. */
export const CRON_WHOLE_NUMBER = /^\d{1,2}$/u;
export const CRON_FIELD_COUNT = 5;
export const CRON_MAX_LENGTH = 100;
/** Hard stop for the search, so an impossible date such as 31 February ends. */
export const CRON_SEARCH_LIMIT = 200_000;
/** A cron routine may fire at most this often, the same floor as the client's scheduled tasks. */
export const CRON_MIN_INTERVAL_MINUTES = 5;
/** How many consecutive gaps are checked against the floor. */
export const CRON_MIN_GAP_CHECKS = 12;
export const CRON_MS_PER_MINUTE = 60_000;
/**
 * What `ScheduledCommand.intervalMinutes` holds for a cron routine. The column
 * is NOT NULL and unused once `cron` is set; the floor is the honest value.
 */
export const CRON_ROUTINE_INTERVAL_PLACEHOLDER_MINUTES = CRON_MIN_INTERVAL_MINUTES;

export const CRON_RANGES: readonly CronFieldRange[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  /** 0 and 7 both mean Sunday. */
  { name: 'day of week', min: 0, max: 7 },
];
