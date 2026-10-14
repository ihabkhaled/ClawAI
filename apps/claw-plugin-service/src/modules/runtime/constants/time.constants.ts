/** 2026-03-29T09:30, no offset, no fraction. A space may stand in for the T. */
export const LOCAL_TIME_MINUTES_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;
/** 2026-03-29T09:30:15. */
export const LOCAL_TIME_SECONDS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})$/;
export const MS_PER_MINUTE = 60_000;
export const DEFAULT_TIME_ZONE = 'UTC';
