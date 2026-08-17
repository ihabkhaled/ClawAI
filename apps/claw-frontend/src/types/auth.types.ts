import type { UserProfile } from './user.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  tokens: TokenPair;
  user: UserProfile;
};

export type RegisterResponse = {
  user: UserProfile;
  verificationRequired: true;
};

export type RefreshResponse = {
  tokens: TokenPair;
};

export type RequestPasswordResetRequest = {
  email: string;
};

export type RequestPasswordResetResponse = {
  accepted: boolean;
};

export type ConfirmPasswordResetRequest = {
  token: string;
  password: string;
};

export type ConfirmPasswordResetResponse = {
  reset: boolean;
};

export type UpdateOwnProfileRequest = {
  currentPassword: string;
  email?: string;
  username?: string;
};

export type DeleteOwnAccountRequest = {
  currentPassword: string;
};

export type AdminUserUpdateRequest = {
  username?: string;
};

export type AdminUserUpdateMutationVariables = {
  userId: string;
  data: AdminUserUpdateRequest;
};

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}
