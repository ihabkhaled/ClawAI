/**
 * ClamAV (clamd, port 3310) client tuning.
 *
 * clamd dies when the host runs short of memory, and a restarted clamd needs
 * ~60 s to load its signature database before it answers. Every upload inside
 * that window used to be rejected with `connect ECONNREFUSED <ip>:3310`.
 * A scan now retries transient connection errors with bounded exponential
 * backoff until this wall-clock deadline, then FAILS CLOSED: an unscanned file
 * is never accepted. See docs/11-runbooks/runbook-clamav-unreachable.md.
 *
 * Constants, not env vars: these are properties of clamd, not of a deployment.
 * The nginx `/api/v1/files` read timeout (150 s) must stay above the deadline.
 */
export const CLAMAV_SCAN_DEADLINE_MS = 90_000;

/** First retry waits this long; each later retry doubles it, up to the cap. */
export const CLAMAV_RETRY_BASE_DELAY_MS = 1_000;
export const CLAMAV_RETRY_MAX_DELAY_MS = 8_000;

/** One INSTREAM round trip (connect + send + verdict). A big file takes a while. */
export const CLAMAV_SCAN_SOCKET_TIMEOUT_MS = 30_000;

/** The health probe's `zPING` → `PONG`. Short: health must answer fast. */
export const CLAMAV_PING_TIMEOUT_MS = 2_000;

/**
 * After a scan has waited the whole deadline and clamd is still gone, further
 * scans inside this window try ONCE instead of waiting another deadline each.
 * Without it, expanding a 100-entry archive while clamd is down would hold the
 * request for 100 × 90 s.
 */
export const CLAMAV_FAIL_FAST_WINDOW_MS = 30_000;

/**
 * Socket error codes that mean "clamd is not answering right now" (restarting,
 * loading its database, container being recreated) rather than "this file is
 * bad". ENOTFOUND/EAI_AGAIN: the container is briefly gone from Docker DNS.
 */
export const CLAMAV_TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

/** clamd wire protocol (null-terminated `z` commands). */
export const CLAMAV_INSTREAM_COMMAND = 'zINSTREAM\0';
export const CLAMAV_PING_COMMAND = 'zPING\0';
export const CLAMAV_PONG_REPLY = 'PONG';

/** Error `code` a socket timeout / an empty reply is reported under. */
export const CLAMAV_TIMEOUT_ERROR_CODE = 'ETIMEDOUT';
export const CLAMAV_EMPTY_REPLY_ERROR_CODE = 'CLAMAV_EMPTY_REPLY';

/**
 * The check reason recorded when clamd could not be reached before the
 * deadline. Stable and host-free: it reaches logs, archive entry rows and,
 * on the other-checks-also-failed path, the client.
 */
export const ANTIVIRUS_UNAVAILABLE_REASON = 'antivirus_unavailable';

/** API error code + safe message for an upload refused because clamd is down. */
export const ANTIVIRUS_UNAVAILABLE_ERROR_CODE = 'ANTIVIRUS_UNAVAILABLE';
export const ANTIVIRUS_UNAVAILABLE_MESSAGE =
  'The virus scanner is restarting. Please try again in a minute.';
