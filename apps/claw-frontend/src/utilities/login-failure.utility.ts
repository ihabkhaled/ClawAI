import { RATE_LIMIT_COPY_KEYS } from '@/constants/rate-limit.constants';
import { ApiErrorCode, LoginFailureReason } from '@/enums';
import type { LoginBanInfo, LoginFailureCopy } from '@/types';

import {
  isRateLimitedError,
  readRetryAfterSeconds,
  resolveRateLimitMessage,
} from './rate-limit.utility';

function errorCode(error: unknown): string | null {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return null;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** The end of a timed ban, or `permanent`, read off an ACCOUNT_BANNED error; null for any other error. */
export function readLoginBanInfo(error: unknown): LoginBanInfo | null {
  if (errorCode(error) !== ApiErrorCode.ACCOUNT_BANNED) {
    return null;
  }
  const { bannedUntil, banPermanent } = error as { bannedUntil?: unknown; banPermanent?: unknown };
  const until =
    typeof bannedUntil === 'string' && !Number.isNaN(Date.parse(bannedUntil)) ? bannedUntil : null;
  return { permanent: banPermanent === true || until === null, until };
}

/**
 * Map a failed sign-in to the one reason we are permitted to show.
 *
 * Anything we do not recognise becomes UNKNOWN rather than
 * INVALID_CREDENTIALS. Telling someone their password is wrong when the real
 * problem was a 502 sends them to reset a password that was never broken.
 */
export function classifyLoginFailure(error: unknown): LoginFailureReason {
  if (isRateLimitedError(error)) {
    return LoginFailureReason.RATE_LIMITED;
  }
  switch (errorCode(error)) {
    case ApiErrorCode.EMAIL_NOT_VERIFIED:
      return LoginFailureReason.EMAIL_NOT_VERIFIED;
    case ApiErrorCode.ACCOUNT_SUSPENDED:
      return LoginFailureReason.ACCOUNT_SUSPENDED;
    case ApiErrorCode.ACCOUNT_BANNED:
      return LoginFailureReason.ACCOUNT_BANNED;
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
export function resolveLoginFailureCopy(
  reason: LoginFailureReason,
  retryAfterSeconds: number | null = null,
  ban: LoginBanInfo | null = null,
): LoginFailureCopy {
  switch (reason) {
    case LoginFailureReason.RATE_LIMITED: {
      // How long, from the server's Retry-After, never a guess.
      const message = resolveRateLimitMessage(retryAfterSeconds);
      return {
        titleKey: RATE_LIMIT_COPY_KEYS.title,
        descriptionKey: message.key,
        descriptionParams: message.params,
        actionKey: null,
        isRecoverable: false,
      };
    }
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
    case LoginFailureReason.ACCOUNT_BANNED:
      // Only ever reached after the password verified, so naming it is safe. A timed ban says
      // when it ends; a lifetime one (or a reply with no usable date) says it is permanent.
      return {
        titleKey: 'auth.loginBannedTitle',
        descriptionKey:
          ban === null || ban.permanent || ban.until === null
            ? 'auth.loginBannedPermanentDescription'
            : 'auth.loginBannedDescription',
        descriptionParams:
          ban === null || ban.permanent || ban.until === null
            ? undefined
            : { date: new Date(ban.until).toLocaleString() },
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

/**
 * The copy the login form shows: the live sign-in error wins, then a ban notice
 * left by the server ending this very session, else nothing.
 */
export function resolveLoginFormFailureCopy(
  isError: boolean,
  error: unknown,
  banNotice: LoginBanInfo | null,
): LoginFailureCopy | null {
  if (isError) {
    return resolveLoginFailureCopy(
      classifyLoginFailure(error),
      readRetryAfterSeconds(error),
      readLoginBanInfo(error),
    );
  }
  if (banNotice === null) {
    return null;
  }
  return resolveLoginFailureCopy(LoginFailureReason.ACCOUNT_BANNED, null, banNotice);
}
