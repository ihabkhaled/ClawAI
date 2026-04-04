import type { AuthStoreState } from "@/types";

export const AUTH_INITIAL_STATE: AuthStoreState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};
