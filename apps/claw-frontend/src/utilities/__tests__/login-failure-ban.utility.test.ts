import { describe, expect, it } from 'vitest';

import { ApiErrorCode, LoginFailureReason } from '@/enums';
import { classifyLoginFailure, readLoginBanInfo, resolveLoginFailureCopy } from '@/utilities';

function bannedError(extra: Record<string, unknown>): Error {
  return Object.assign(new Error('Account is banned'), {
    code: ApiErrorCode.ACCOUNT_BANNED,
    ...extra,
  });
}

describe('banned sign-in (ADR-200)', () => {
  it('classifies ACCOUNT_BANNED as its own reason', () => {
    expect(classifyLoginFailure(bannedError({}))).toBe(LoginFailureReason.ACCOUNT_BANNED);
  });

  it('reads the end of a timed ban', () => {
    expect(
      readLoginBanInfo(
        bannedError({ bannedUntil: '2026-11-05T10:00:00.000Z', banPermanent: false }),
      ),
    ).toEqual({ permanent: false, until: '2026-11-05T10:00:00.000Z' });
  });

  it('reads a lifetime ban, and treats an unusable date as permanent', () => {
    expect(readLoginBanInfo(bannedError({ bannedUntil: null, banPermanent: true }))).toEqual({
      permanent: true,
      until: null,
    });
    expect(readLoginBanInfo(bannedError({ bannedUntil: 'garbage', banPermanent: false }))).toEqual({
      permanent: true,
      until: null,
    });
  });

  it('reads nothing from any other error', () => {
    expect(readLoginBanInfo(new Error('x'))).toBeNull();
    expect(
      readLoginBanInfo({ code: ApiErrorCode.INVALID_CREDENTIALS, bannedUntil: 'x' }),
    ).toBeNull();
    expect(readLoginBanInfo(null)).toBeNull();
  });

  it('says "until {date}" for a timed ban with the formatted date', () => {
    const copy = resolveLoginFailureCopy(LoginFailureReason.ACCOUNT_BANNED, null, {
      permanent: false,
      until: '2026-11-05T10:00:00.000Z',
    });
    expect(copy.titleKey).toBe('auth.loginBannedTitle');
    expect(copy.descriptionKey).toBe('auth.loginBannedDescription');
    expect(typeof copy.descriptionParams?.date).toBe('string');
    expect(copy.isRecoverable).toBe(false);
    expect(copy.actionKey).toBeNull();
  });

  it('says "permanently" for a lifetime ban or when nothing is known', () => {
    for (const ban of [{ permanent: true, until: null }, null]) {
      const copy = resolveLoginFailureCopy(LoginFailureReason.ACCOUNT_BANNED, null, ban);
      expect(copy.descriptionKey).toBe('auth.loginBannedPermanentDescription');
      expect(copy.descriptionParams).toBeUndefined();
    }
  });
});
