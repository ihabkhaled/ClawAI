import type { AuthStoreState } from '@/types';

export const AUTH_INITIAL_STATE: AuthStoreState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  persistent: true,
};

/** localStorage key every tab reads and writes the session under. */
export const AUTH_STORAGE_KEY = 'claw-auth-storage';

/**
 * A cookie with no expiry, so the browser drops it when it closes. A login
 * without "Remember me" ends when it is gone (ADR-106).
 */
export const AUTH_MARKER_COOKIE = 'claw-auth-token';

/** Web Locks name: one tab at a time may spend the refresh token (ADR-106). */
export const AUTH_REFRESH_LOCK = 'claw-auth-refresh';

/**
 * A refresh answered with one of these means the session is over. Anything
 * else (offline after sleep, a 5xx, a timeout) says nothing about the session,
 * and logging out on it signed people out for a dropped connection.
 */
export const SESSION_ENDING_REFRESH_STATUSES: readonly number[] = [400, 401, 403];
