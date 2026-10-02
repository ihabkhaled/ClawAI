import { describe, expect, it } from 'vitest';

import {
  REGISTER_FIELD_FALLBACK_KEYS,
  REGISTER_ISSUE_MESSAGE_KEYS,
} from '@/constants/register.constants';
import { RegisterValidationIssue } from '@/enums/register-validation-issue.enum';
import { SignupFailureReason } from '@/enums/signup-failure-reason.enum';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { zh } from '@/lib/i18n/locales/zh';
import { ApiClientError } from '@/services/shared/api-client';
import {
  classifySignupFailure,
  evaluatePasswordRules,
  readSignupRequestId,
  resolveSignupFailureCopy,
  resolveSignupFieldErrors,
} from '@/utilities/signup-failure.utility';

const LOCALES = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

function lookup(dictionary: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      dictionary,
    );
}

function apiError(
  status: number,
  code?: string,
  errors?: Record<string, string[]>,
  requestId?: string,
): ApiClientError {
  return new ApiClientError({ message: 'backend text', status, code, errors, requestId });
}

describe('classifySignupFailure', () => {
  it.each([
    [apiError(409, 'DUPLICATE_ENTITY'), SignupFailureReason.EMAIL_TAKEN],
    [
      apiError(400, 'VALIDATION_FAILED', { email: ['EMAIL_INVALID'] }),
      SignupFailureReason.INVALID_DETAILS,
    ],
    [apiError(400, 'WEAK_PASSWORD'), SignupFailureReason.INVALID_DETAILS],
    [apiError(429, 'RATE_LIMITED'), SignupFailureReason.RATE_LIMITED],
    [apiError(429), SignupFailureReason.RATE_LIMITED],
    [apiError(503, 'SIGNUP_PLAN_ASSIGNMENT_FAILED'), SignupFailureReason.ACCOUNT_SETUP_FAILED],
    [apiError(0), SignupFailureReason.NETWORK],
    [apiError(400, undefined, { password: ['x'] }), SignupFailureReason.INVALID_DETAILS],
    // A 500 or an unknown code is UNKNOWN, never a guess (rule 43 §2).
    [apiError(500), SignupFailureReason.UNKNOWN],
    [apiError(502), SignupFailureReason.UNKNOWN],
    [apiError(400, 'SOMETHING_NEW'), SignupFailureReason.UNKNOWN],
    [new Error('boom'), SignupFailureReason.UNKNOWN],
    [null, SignupFailureReason.UNKNOWN],
  ])('%#: classifies as %s', (error, expected) => {
    expect(classifySignupFailure(error)).toBe(expected);
  });
});

describe('resolveSignupFailureCopy', () => {
  it('offers sign-in and reset only for a taken address', () => {
    for (const reason of Object.values(SignupFailureReason)) {
      expect(resolveSignupFailureCopy(reason).offersSignIn).toBe(
        reason === SignupFailureReason.EMAIL_TAKEN,
      );
    }
  });

  it('shows the request reference only for faults on our side', () => {
    const withReference = Object.values(SignupFailureReason).filter(
      (reason) => resolveSignupFailureCopy(reason).showsRequestId,
    );
    expect(withReference.sort()).toEqual(
      [SignupFailureReason.ACCOUNT_SETUP_FAILED, SignupFailureReason.UNKNOWN].sort(),
    );
  });

  it('never reuses the old generic "Registration failed" copy', () => {
    for (const reason of Object.values(SignupFailureReason)) {
      const copy = resolveSignupFailureCopy(reason);
      expect(copy.titleKey).not.toBe('auth.registerFailed');
      expect(copy.descriptionKey).not.toBe('auth.registerFailed');
    }
  });

  it('makes the unknown 5xx copy actionable', () => {
    expect(en.auth.signup.unknownTitle).toBe("We couldn't create your account right now");
    expect(en.auth.signup.unknownDescription).toContain('try again in a few minutes');
    expect(en.auth.signup.unknownDescription).toContain('contact support');
  });
});

describe('resolveSignupFieldErrors', () => {
  it('maps every backend issue code to its own copy on the right field', () => {
    const error = apiError(400, 'VALIDATION_FAILED', {
      email: ['EMAIL_INVALID'],
      password: ['PASSWORD_NEEDS_UPPERCASE', 'PASSWORD_NEEDS_NUMBER'],
      phone: ['PHONE_INVALID'],
    });
    expect(resolveSignupFieldErrors(error)).toEqual([
      { field: 'email', messageKey: 'auth.signup.emailInvalid' },
      { field: 'password', messageKey: 'auth.signup.passwordNeedsUppercase' },
      { field: 'phone', messageKey: 'auth.signup.phoneInvalid' },
    ]);
  });

  it('falls back to field copy for an unknown code and drops unknown fields', () => {
    const error = apiError(400, 'VALIDATION_FAILED', {
      lastName: ['Required'],
      languagePreference: ['bad'],
    });
    expect(resolveSignupFieldErrors(error)).toEqual([
      { field: 'lastName', messageKey: 'auth.signup.lastNameRequired' },
    ]);
  });

  it('pins WEAK_PASSWORD to the password field', () => {
    expect(resolveSignupFieldErrors(apiError(400, 'WEAK_PASSWORD'))).toEqual([
      { field: 'password', messageKey: 'auth.signup.passwordWeak' },
    ]);
  });

  it('returns nothing for a non-field failure', () => {
    expect(resolveSignupFieldErrors(apiError(409, 'DUPLICATE_ENTITY'))).toEqual([]);
  });
});

describe('readSignupRequestId', () => {
  it('reads the reference the API client attached', () => {
    expect(readSignupRequestId(apiError(500, undefined, undefined, 'req-9'))).toBe('req-9');
    expect(readSignupRequestId(apiError(500))).toBeNull();
    expect(readSignupRequestId('x')).toBeNull();
  });
});

describe('evaluatePasswordRules', () => {
  it('ticks each rule independently as the password grows', () => {
    const met = (password: string): string[] =>
      evaluatePasswordRules(password)
        .filter((rule) => rule.isMet)
        .map((rule) => rule.id);
    expect(met('')).toEqual([]);
    expect(met('abc')).toEqual(['lowercase']);
    expect(met('Abcdefg1')).toEqual(['length', 'uppercase', 'lowercase', 'number']);
  });
});

describe('sign-up copy exists in all 13 locales', () => {
  const keys = new Set<string>([
    ...Object.values(REGISTER_ISSUE_MESSAGE_KEYS),
    ...Object.values(REGISTER_FIELD_FALLBACK_KEYS),
    ...evaluatePasswordRules('').map((rule) => rule.labelKey),
    ...Object.values(SignupFailureReason).flatMap((reason) => {
      const copy = resolveSignupFailureCopy(reason);
      return [copy.titleKey, copy.descriptionKey];
    }),
  ]);

  it('covers every backend issue code', () => {
    expect(Object.keys(REGISTER_ISSUE_MESSAGE_KEYS).sort()).toEqual(
      Object.values(RegisterValidationIssue).sort(),
    );
  });

  it.each(Object.entries(LOCALES))('%s has a real string for every key', (locale, dictionary) => {
    for (const key of keys) {
      const value = lookup(dictionary, key);
      expect(typeof value, `${locale}: ${key}`).toBe('string');
      expect((value as string).length, `${locale}: ${key}`).toBeGreaterThan(0);
    }
  });

  it('translates rather than copies English', () => {
    for (const [locale, dictionary] of Object.entries(LOCALES)) {
      if (locale === 'en') {
        continue;
      }
      expect(lookup(dictionary, 'auth.signup.unknownDescription'), locale).not.toBe(
        en.auth.signup.unknownDescription,
      );
    }
  });
});

describe('signup rate limit copy', () => {
  it('uses Retry-After for the minutes', () => {
    expect(resolveSignupFailureCopy(SignupFailureReason.RATE_LIMITED, 3540)).toMatchObject({
      titleKey: 'auth.signup.rateLimitedTitle',
      descriptionKey: 'auth.rateLimit.tryAgainInMinutes',
      descriptionParams: { minutes: 59 },
    });
  });

  it('keeps the generic copy when no header came back', () => {
    expect(resolveSignupFailureCopy(SignupFailureReason.RATE_LIMITED)).toMatchObject({
      descriptionKey: 'auth.signup.rateLimitedDescription',
    });
    expect(
      resolveSignupFailureCopy(SignupFailureReason.RATE_LIMITED).descriptionParams,
    ).toBeUndefined();
  });
});
