export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_DAYS = 7;
export const MONTH_DAYS = 30;
export const YEAR_DAYS = 365;

/** The one shared ticker beats at this rate; each subscriber then throttles itself by age. */
export const RELATIVE_TIME_TICK_MS = 30_000;
/** A subscriber may be called this much earlier than its refresh period (timer jitter). */
export const RELATIVE_TIME_TICK_SLACK_MS = 1_000;
/** Refresh period while a timestamp is under an hour old, under a day old, and older. */
export const RELATIVE_TIME_REFRESH_FRESH_MS = 30_000;
export const RELATIVE_TIME_REFRESH_TODAY_MS = MINUTE_MS;
export const RELATIVE_TIME_REFRESH_OLD_MS = 10 * MINUTE_MS;

/** An ISO date-time (date, then time of day). Paired with the zone pattern to spot a zoneless one. */
export const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
/** A trailing zone: Z, or a +hh:mm / -hhmm offset. */
export const ISO_ZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;
