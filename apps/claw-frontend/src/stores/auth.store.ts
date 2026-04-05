import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AUTH_INITIAL_STATE } from '@/constants';
import type { AuthStoreActions, AuthStoreState } from '@/types';

/**
 * SECURITY NOTE: Auth tokens are persisted in localStorage via Zustand's
 * persist middleware. This is a known trade-off — httpOnly cookies are
 * preferred for token storage as they are immune to XSS exfiltration.
 * localStorage was chosen here for simplicity with the SPA architecture.
 *
 * Mitigations in place:
 * - Tokens are NEVER logged to console anywhere in the codebase.
 * - Short-lived access tokens with automatic refresh rotation.
 * - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 *   are configured in next.config.mjs to reduce XSS attack surface.
 * - Content Security Policy should be added when moving to production.
 */
export const useAuthStore = create<AuthStoreState & AuthStoreActions>()(
  persist(
    (set) => ({
      ...AUTH_INITIAL_STATE,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

      clearAuth: () => set(AUTH_INITIAL_STATE),
    }),
    {
      name: 'claw-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
