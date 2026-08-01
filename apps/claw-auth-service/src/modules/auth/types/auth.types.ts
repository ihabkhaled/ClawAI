import type { TokenPair } from './token-session.types';

export type { TokenPair } from './token-session.types';

export interface AuthUserSummary {
  id: string;
  email: string;
  username: string;
  role: string;
  // Effective permissions resolved from the user's role grants (DB-backed).
  permissions: string[];
  mustChangePassword: boolean;
  languagePreference: string;
  appearancePreference: string;
}

export interface LoginResult {
  tokens: TokenPair;
  user: AuthUserSummary;
}

export interface RegisterResult {
  tokens: TokenPair;
  user: AuthUserSummary;
}

export interface RefreshResult {
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  status: string;
  mustChangePassword: boolean;
  languagePreference: string;
  appearancePreference: string;
  createdAt: Date;
}
