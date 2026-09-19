/**
 * SECURITY NOTE: Tokens are read from localStorage here. This is a known
 * trade-off (httpOnly cookies preferred). Tokens must NEVER be logged,
 * included in error reports, or exposed to third-party scripts.
 */
import { AUTH_STORAGE_KEY } from '@/constants/auth.constants';
import type { StoredSession } from '@/types/store.types';

type PersistedAuthState = {
  state: {
    accessToken?: string;
    refreshToken?: string;
    isAuthenticated?: boolean;
    persistent?: boolean;
  };
};

function getPersistedState(): PersistedAuthState['state'] | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === 'object' && parsed !== null && 'state' in parsed) {
      return (parsed as PersistedAuthState).state;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The session as storage holds it now, which is the truth shared by every tab.
 * Missing storage means another tab signed out. Null outside a browser.
 */
export function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const state = getPersistedState();
  return {
    accessToken: state?.accessToken ?? null,
    refreshToken: state?.refreshToken ?? null,
    isAuthenticated: state?.isAuthenticated ?? false,
    persistent: state?.persistent ?? true,
  };
}

export function getAccessToken(): string | null {
  const state = getPersistedState();
  return state?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  const state = getPersistedState();
  return state?.refreshToken ?? null;
}

/**
 * Updates tokens in both localStorage and the Zustand store.
 * Called by the HTTP interceptor after a successful token refresh.
 * We import the store lazily to avoid circular dependency issues.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    // Update localStorage directly (so the next request picks it up immediately)
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === 'object' && parsed !== null && 'state' in parsed) {
      const data = parsed as PersistedAuthState & Record<string, unknown>;
      data.state = { ...data.state, accessToken, refreshToken };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    }

    // Sync the Zustand in-memory store (lazy import to avoid circular deps)
    import('@/stores/auth.store')
      .then(({ useAuthStore }) => {
        useAuthStore.getState().setTokens({ accessToken, refreshToken });
      })
      .catch(() => {
        // Store not available yet
      });
  } catch {
    // Storage unavailable
  }
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);

    import('@/stores/auth.store')
      .then(({ useAuthStore }) => {
        useAuthStore.getState().clearAuth();
      })
      .catch(() => {
        // Store not available yet
      });
  } catch {
    // Storage unavailable
  }
}
