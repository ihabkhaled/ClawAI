/**
 * The revocation check sits in front of every authenticated request, so it is
 * bounded hard: a slow Redis must cost a few milliseconds, not the request.
 */
export const REVOCATION_CHECK_TIMEOUT_MS = 150;
export const REVOCATION_CONNECT_TIMEOUT_MS = 1_000;
export const REVOCATION_RETRY_BASE_MS = 200;
export const REVOCATION_RETRY_MAX_MS = 5_000;
