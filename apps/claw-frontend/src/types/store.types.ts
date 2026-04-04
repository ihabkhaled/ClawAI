import type { UserProfile } from "./user.types";

export type AuthStoreState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
};

export type AuthStoreActions = {
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  }) => void;
  setUser: (user: UserProfile) => void;
  setTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearAuth: () => void;
};
