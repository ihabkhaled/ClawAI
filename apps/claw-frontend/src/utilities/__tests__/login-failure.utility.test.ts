import { describe, expect, it } from 'vitest';

import { ApiErrorCode, LoginFailureReason } from '@/enums';
import { classifyLoginFailure, resolveLoginFailureCopy } from '@/utilities';

function apiError(code: string): Error & { code: string } {
  return Object.assign(new Error('whatever the server said'), { code });
}

describe('classifyLoginFailure', () => {
  it('names an unverified address, which is the one failure the user can fix', () => {
    expect(classifyLoginFailure(apiError(ApiErrorCode.EMAIL_NOT_VERIFIED))).toBe(
      LoginFailureReason.EMAIL_NOT_VERIFIED,
    );
  });

  it('names a suspended account', () => {
    expect(classifyLoginFailure(apiError(ApiErrorCode.ACCOUNT_SUSPENDED))).toBe(
      LoginFailureReason.ACCOUNT_SUSPENDED,
    );
  });

  it('treats a bad sign-in as one reason, never two', () => {
    expect(classifyLoginFailure(apiError(ApiErrorCode.INVALID_CREDENTIALS))).toBe(
      LoginFailureReason.INVALID_CREDENTIALS,
    );
  });

  // A 502 is not a wrong password. Collapsing the two would send somebody to
  // reset a password that was never the problem.
  it('does NOT guess "wrong password" for an unattributable failure', () => {
    expect(classifyLoginFailure(new Error('Network request failed'))).toBe(
      LoginFailureReason.UNKNOWN,
    );
    expect(classifyLoginFailure(apiError('INTERNAL_SERVER_ERROR'))).toBe(
      LoginFailureReason.UNKNOWN,
    );
    expect(classifyLoginFailure(null)).toBe(LoginFailureReason.UNKNOWN);
    expect(classifyLoginFailure(undefined)).toBe(LoginFailureReason.UNKNOWN);
    expect(classifyLoginFailure({ code: 42 })).toBe(LoginFailureReason.UNKNOWN);
  });
});

describe('resolveLoginFailureCopy', () => {
  it('offers a way out only for the recoverable failure', () => {
    expect(resolveLoginFailureCopy(LoginFailureReason.EMAIL_NOT_VERIFIED)).toMatchObject({
      isRecoverable: true,
    });
    expect(resolveLoginFailureCopy(LoginFailureReason.EMAIL_NOT_VERIFIED).actionKey).not.toBeNull();

    for (const reason of [
      LoginFailureReason.INVALID_CREDENTIALS,
      LoginFailureReason.ACCOUNT_SUSPENDED,
      LoginFailureReason.UNKNOWN,
    ]) {
      expect(resolveLoginFailureCopy(reason).actionKey).toBeNull();
      expect(resolveLoginFailureCopy(reason).isRecoverable).toBe(false);
    }
  });

  it('gives every reason its own distinct copy', () => {
    const descriptions = Object.values(LoginFailureReason).map(
      (reason) => resolveLoginFailureCopy(reason).descriptionKey,
    );
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('returns keys under the auth namespace so the i18n reference test can find them', () => {
    for (const reason of Object.values(LoginFailureReason)) {
      const copy = resolveLoginFailureCopy(reason);
      expect(copy.titleKey.startsWith('auth.')).toBe(true);
      expect(copy.descriptionKey.startsWith('auth.')).toBe(true);
    }
  });
});
