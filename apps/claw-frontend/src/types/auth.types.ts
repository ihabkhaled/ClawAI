import type { UserProfile } from "./user.types";

export interface LoginRequest {
  email: string;
  password: string;
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  tokens: TokenPair;
  user: UserProfile;
};

export type RefreshResponse = {
  tokens: TokenPair;
};

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}
