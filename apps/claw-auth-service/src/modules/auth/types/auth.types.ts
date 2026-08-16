import type { TokenPair } from './token-session.types';

export type { TokenPair } from './token-session.types';

export interface AuthUserSummary {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  // Effective permissions resolved from the user's role grants (DB-backed).
  permissions: string[];
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  languagePreference: string;
  appearancePreference: string;
}

export interface LoginResult {
  tokens: TokenPair;
  user: AuthUserSummary;
}

export interface RegisterResult {
  user: AuthUserSummary;
  verificationRequired: true;
}

export interface RefreshResult {
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  status: string;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  languagePreference: string;
  appearancePreference: string;
  createdAt: Date;
}
