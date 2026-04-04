import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_INITIAL_STATE } from "@/constants";
import type { AuthStoreActions, AuthStoreState } from "@/types";

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

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      clearAuth: () => set(AUTH_INITIAL_STATE),
    }),
    {
      name: "claw-auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
