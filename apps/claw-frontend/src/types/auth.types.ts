import type { EmailChangeStage } from '@/enums/email-change-stage.enum';
import type { UserLanguagePreference } from '@/enums/user-language-preference.enum';

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
  // The language the user is signing up IN. Sent so the very first email they
  // receive — the one that decides whether they can sign in at all — arrives
  // in that language instead of English. There is no session yet for the
  // backend to read a preference from, so the client has to say.
  languagePreference?: UserLanguagePreference;
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

/**
 * The i18n keys for one login failure, plus whether the user can do anything
 * about it. `actionKey` is non-null only for a recoverable failure — an
 * unverified address — because offering a button that cannot help is worse
 * than offering none.
 */
export type LoginFailureCopy = {
  titleKey: string;
  descriptionKey: string;
  actionKey: string | null;
  isRecoverable: boolean;
};

/**
 * Copy for one email-verification outcome, expanded from the original
 * title+body pair. The page it drives is the first thing a new user sees after
 * clicking a link in their inbox, and a heading plus one sentence left them
 * with nowhere to go — hence the explicit next step and the secondary route
 * out for the failure case.
 */
export type EmailVerificationPanelCopy = {
  titleKey: string;
  bodyKey: string;
  /** What happens now, in plain terms. */
  detailKey: string;
  primaryActionKey: string;
  /** A second way out, for an outcome where the first one may not apply. */
  secondaryActionKey: string | null;
};

/**
 * The answer to a confirmation-email resend request.
 *
 * `accepted` is always true and carries no information — the endpoint answers
 * identically for an address with a pending account, an already-verified one,
 * and one that has never been seen (ADR-096). `retryAfterSeconds` is present on
 * EVERY response, not only when rate-limited, for the same reason: a field that
 * appears in one case only is itself a signal.
 */
export type ResendVerificationResponse = {
  accepted: true;
  retryAfterSeconds: number;
};
