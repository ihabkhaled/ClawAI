import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AUTH_INITIAL_STATE, AUTH_STORAGE_KEY } from '@/constants';
import type { AuthStoreActions, AuthStoreState } from '@/types';
import { readStoredSession } from '@/utilities/api.utility';
import {
  hasBrowserSessionMarker,
  markBrowserSession,
} from '@/utilities/auth-session-cookie.utility';

/**
 * SECURITY NOTE: Auth tokens are persisted in localStorage via Zustand's
 * persist middleware. This is a known trade-off — httpOnly cookies are
 * preferred for token storage as they are immune to XSS exfiltration
 * (TD-008).
 *
 * Every tab shares this storage, so storage is the truth and a tab's
 * in-memory copy is only a cache (ADR-106):
 * - a tab re-reads the session when another tab changes it (the `storage`
 *   event below);
 * - a setter that does not change the session takes the session fields from
 *   storage, never from its own copy. Persisting a stale copy undid another
 *   tab's refresh or login, and the next refresh then spent a used token and
 *   signed everyone out.
 */
export const useAuthStore = create<AuthStoreState & AuthStoreActions>()(
  persist(
    (set) => ({
      ...AUTH_INITIAL_STATE,

      setAuth: ({ accessToken, refreshToken, user, persistent }) =>
        set({
          accessToken,
          refreshToken,
          user,
          persistent,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ ...readStoredSession(), user }),

      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

      clearAuth: () => set(AUTH_INITIAL_STATE),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        persistent: state.persistent,
      }),
      // "Remember me" off: the login ends with the browser session. The marker
      // cookie has no expiry, so it is gone after the browser was closed.
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated !== true) {
          return;
        }
        if (state.persistent) {
          markBrowserSession();
        } else if (!hasBrowserSessionMarker()) {
          state.clearAuth();
        }
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY && event.key !== null) {
      return;
    }
    // Another tab signed out: follow it rather than keep a dead session here.
    if (event.newValue === null) {
      useAuthStore.setState(AUTH_INITIAL_STATE);
      return;
    }
    void useAuthStore.persist.rehydrate();
  });
}
