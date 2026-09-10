export const SSE_RECONNECT_BASE_MS = 1000;
export const SSE_RECONNECT_MAX_BACKOFF_MS = 15_000;
export const SSE_RECONNECT_MAX_ATTEMPTS = 10;

/**
 * How long a connection may stay silent before it is treated as dead.
 *
 * The server sends a heartbeat every 15 seconds, so silence past this point is
 * three missed beats — comfortably past jitter and well short of the user
 * deciding the app is broken.
 *
 * This exists because a reconnect only helps a connection that ENDS. A proxy or
 * a sleeping laptop can leave the socket open and simply stop delivering, and
 * the old client waited on `reader.read()` for as long as that lasted: no
 * error, no reconnect, no message, and a spinner that never resolved. Nothing
 * on the page said anything was wrong.
 */
export const SSE_STALL_TIMEOUT_MS = 45_000;
