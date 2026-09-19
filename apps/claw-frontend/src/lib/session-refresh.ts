import axios from 'axios';

import { API_BASE_URL, AUTH_REFRESH_LOCK, SESSION_ENDING_REFRESH_STATUSES } from '@/constants';
import type { RefreshResponse } from '@/types';
import { getAccessToken, getRefreshToken, setTokens } from '@/utilities';

let inFlight: Promise<string | null> | null = null;

/**
 * A working access token after a 401, or null when the session really ended.
 *
 * Every open tab shares one refresh token, and the server burns it on first
 * use. Two tabs refreshing together used to spend it twice. The second use
 * looked like theft, the server revoked the whole session, and both tabs
 * signed out (ADR-106). So:
 * - one refresh per tab (callers join the one in flight);
 * - one tab at a time, through the Web Locks API;
 * - under the lock, a token another tab already got is used instead of
 *   refreshing again.
 *
 * Throws when the refresh could not be attempted, for example offline or on
 * a 5xx. The session is not over then, and the caller keeps it.
 */
export function refreshSession(staleAccessToken: string | null): Promise<string | null> {
  inFlight ??= withRefreshLock(() => refreshUnderLock(staleAccessToken)).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** The token a request was sent with, from its Authorization header. */
export function bearerTokenOf(header: unknown): string | null {
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(AUTH_REFRESH_LOCK, task);
  }
  return task();
}

async function refreshUnderLock(staleAccessToken: string | null): Promise<string | null> {
  const current = getAccessToken();
  if (current !== null && current !== staleAccessToken) {
    return current;
  }
  const refreshToken = getRefreshToken();
  if (refreshToken === null) {
    return null;
  }
  try {
    const { data } = await axios.post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return data.tokens.accessToken;
  } catch (error) {
    if (!endsSession(error)) {
      throw error;
    }
    // Another tab signed in again while this refresh was failing: use its session.
    const latest = getRefreshToken();
    return latest !== null && latest !== refreshToken ? getAccessToken() : null;
  }
}

function endsSession(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response !== undefined &&
    SESSION_ENDING_REFRESH_STATUSES.includes(error.response.status)
  );
}
