import type { EmailChangeStage } from '@/enums/email-change-stage.enum';

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
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

export type DeleteOwnAccountRequest = {
  currentPassword: string;
};

export type AdminUserUpdateRequest = {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * Body for `POST /users`, the administrator create-user endpoint.
 *
 * The account is born ACTIVE and email-verified — an administrator vouching for
 * the address is the verification — and `mustChangePassword` is set server-side,
 * so the password an administrator types here never becomes the standing one.
 */
export type AdminCreateUserRequest = {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password: string;
  role: string;
};

export type AdminUserUpdateMutationVariables = {
  userId: string;
  data: AdminUserUpdateRequest;
};

export type RequestEmailChangeRequest = {
  currentPassword: string;
  newEmail: string;
};

export type RequestEmailChangeResponse = {
  requestId: string;
  expiresAt: string;
};

export type ConfirmOldEmailOtpRequest = {
  requestId: string;
  otp: string;
};

export type ConfirmOldEmailOtpResponse = {
  pendingEmailSent: boolean;
};

export type ResendEmailChangeOtpRequest = {
  requestId: string;
};

export type ResendEmailChangeOtpResponse = {
  accepted: true;
};

export type CancelEmailChangeRequest = {
  requestId: string;
};

export type EmailChangePendingState = {
  requestId: string;
  stage: EmailChangeStage;
  maskedNewEmail: string;
  expiresAt: string;
};

export type ConfirmEmailChangeRequest = {
  token: string;
};

export type ConfirmEmailChangeResponse = {
  changed: boolean;
};

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}

/** Locale keys for one email-verification outcome. */
export type EmailVerificationCopyKeys = {
  titleKey: string;
  bodyKey: string;
};
