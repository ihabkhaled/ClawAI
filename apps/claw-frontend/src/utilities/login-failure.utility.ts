import { ApiErrorCode, LoginFailureReason } from '@/enums';
import type { LoginFailureCopy } from '@/types';

function errorCode(error: unknown): string | null {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return null;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Map a failed sign-in to the one reason we are permitted to show.
 *
 * Anything we do not recognise becomes UNKNOWN rather than
 * INVALID_CREDENTIALS. Telling someone their password is wrong when the real
 * problem was a 502 sends them to reset a password that was never broken.
 */
export function classifyLoginFailure(error: unknown): LoginFailureReason {
  switch (errorCode(error)) {
    case ApiErrorCode.EMAIL_NOT_VERIFIED:
      return LoginFailureReason.EMAIL_NOT_VERIFIED;
    case ApiErrorCode.ACCOUNT_SUSPENDED:
      return LoginFailureReason.ACCOUNT_SUSPENDED;
    case ApiErrorCode.INVALID_CREDENTIALS:
      return LoginFailureReason.INVALID_CREDENTIALS;
    default:
      return LoginFailureReason.UNKNOWN;
  }
}

/**
 * The i18n keys for one login failure, plus whether it deserves a way out.
 *
 * The backend message is never shown. It is written for an operator reading a
 * log, it is only ever English, and for INVALID_CREDENTIALS it says "Invalid
 * email or password" — which is exactly the phrasing the product has decided
 * not to use, because it invites the reader to guess which half was wrong.
 */
export function resolveLoginFailureCopy(reason: LoginFailureReason): LoginFailureCopy {
  switch (reason) {
    case LoginFailureReason.EMAIL_NOT_VERIFIED:
      return {
        titleKey: 'auth.loginEmailNotVerifiedTitle',
        descriptionKey: 'auth.loginEmailNotVerifiedDescription',
        // The only failure with an action attached, because it is the only one
        // the user can resolve themselves right now.
        actionKey: 'auth.loginEmailNotVerifiedAction',
        isRecoverable: true,
      };
    case LoginFailureReason.ACCOUNT_SUSPENDED:
      return {
        titleKey: 'auth.loginSuspendedTitle',
        descriptionKey: 'auth.loginSuspendedDescription',
        actionKey: null,
        isRecoverable: false,
      };
    case LoginFailureReason.INVALID_CREDENTIALS:
      return {
        titleKey: 'auth.loginInvalidCredentialsTitle',
        descriptionKey: 'auth.loginInvalidCredentialsDescription',
        actionKey: null,
        isRecoverable: false,
      };
    case LoginFailureReason.UNKNOWN:
      return {
        titleKey: 'auth.loginFailedTitle',
        descriptionKey: 'auth.loginUnknownDescription',
        actionKey: null,
        isRecoverable: false,
      };
  }
}
