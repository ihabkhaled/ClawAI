import { describe, expect, it } from 'vitest';

import { LoginFailureReason } from '@/enums';
import { Locale } from '@/enums/locale.enum';
import { SignupFailureReason } from '@/enums/signup-failure-reason.enum';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { getDictionary } from '@/lib/i18n/translations';
import { ApiClientError } from '@/services/shared/api-client';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { isBotCheckRequiredError, resolveAuthSubmitLabelKey } from '@/utilities/bot-check.utility';
import { classifyLoginFailure, resolveLoginFailureCopy } from '@/utilities/login-failure.utility';
import {
  classifySignupFailure,
  resolveSignupFailureCopy,
  resolveSignupFieldErrors,
} from '@/utilities/signup-failure.utility';

const refusal = (status: number, code: string, retryAfterSeconds?: number): ApiClientError =>
  new ApiClientError({ message: 'English backend text', status, code, retryAfterSeconds });

/** Every i18n key a refusal can render, with the params it is rendered with. */
function renderedKeys(): Array<{ key: string; params?: Record<string, number> }> {
  const keys: Array<{ key: string; params?: Record<string, number> }> = [];
  for (const [error, retry] of [
    [refusal(428, 'BOT_CHECK_REQUIRED'), null],
    [refusal(403, 'BOT_CHECK_FAILED'), null],
    [refusal(400, 'DISPOSABLE_EMAIL'), null],
    [refusal(400, 'EMAIL_DOMAIN_UNDELIVERABLE'), null],
    [refusal(429, 'SIGNUP_TEMPORARILY_LIMITED'), 600],
    [refusal(429, 'SIGNUP_TEMPORARILY_LIMITED'), 60],
    [refusal(429, 'SIGNUP_TEMPORARILY_LIMITED'), null],
  ] as const) {
    const copy = resolveSignupFailureCopy(classifySignupFailure(error), retry);
    keys.push({ key: copy.titleKey }, { key: copy.descriptionKey, params: copy.descriptionParams });
    for (const fieldError of resolveSignupFieldErrors(error)) {
      keys.push({ key: fieldError.messageKey });
    }
  }
  for (const code of ['BOT_CHECK_REQUIRED', 'BOT_CHECK_FAILED']) {
    const copy = resolveLoginFailureCopy(classifyLoginFailure(refusal(403, code)));
    keys.push({ key: copy.titleKey }, { key: copy.descriptionKey });
  }
  keys.push({ key: 'auth.botCheck.checking' }, { key: 'auth.botCheck.widgetLabel' });
  return keys;
}

describe('sign-up refusal codes', () => {
  it('BOT_CHECK_REQUIRED and BOT_CHECK_FAILED get their own copy, never the server text', () => {
    expect(
      resolveSignupFailureCopy(classifySignupFailure(refusal(428, 'BOT_CHECK_REQUIRED'))),
    ).toMatchObject({
      titleKey: 'auth.botCheck.requiredTitle',
      descriptionKey: 'auth.botCheck.requiredDescription',
      offersSignIn: false,
    });
    expect(
      resolveSignupFailureCopy(classifySignupFailure(refusal(403, 'BOT_CHECK_FAILED'))),
    ).toMatchObject({
      titleKey: 'auth.botCheck.failedTitle',
      descriptionKey: 'auth.botCheck.failedDescription',
    });
  });

  it.each([
    ['DISPOSABLE_EMAIL', 'auth.botCheck.disposableEmail'],
    ['EMAIL_DOMAIN_UNDELIVERABLE', 'auth.botCheck.emailUndeliverable'],
  ])('%s is shown on the email field and the alert asks to fix it', (code, key) => {
    const error = refusal(400, code);
    expect(classifySignupFailure(error)).toBe(SignupFailureReason.INVALID_DETAILS);
    expect(resolveSignupFieldErrors(error)).toEqual([{ field: 'email', messageKey: key }]);
  });

  it('SIGNUP_TEMPORARILY_LIMITED says how long, from Retry-After rounded up to minutes', () => {
    const error = refusal(429, 'SIGNUP_TEMPORARILY_LIMITED', 125);
    expect(classifySignupFailure(error)).toBe(SignupFailureReason.SIGNUP_LIMITED);
    expect(resolveSignupFailureCopy(SignupFailureReason.SIGNUP_LIMITED, 125)).toMatchObject({
      titleKey: 'auth.botCheck.signupLimitedTitle',
      descriptionKey: 'auth.botCheck.signupLimitedInMinutes',
      descriptionParams: { minutes: 3 },
    });
    expect(resolveSignupFailureCopy(SignupFailureReason.SIGNUP_LIMITED, 40).descriptionKey).toBe(
      'auth.botCheck.signupLimitedInOneMinute',
    );
    expect(resolveSignupFailureCopy(SignupFailureReason.SIGNUP_LIMITED, null).descriptionKey).toBe(
      'auth.botCheck.signupLimitedFallback',
    );
  });

  it('a bare 429 is still the per-person rate limit, not the platform pause', () => {
    expect(classifySignupFailure(new ApiClientError({ message: 'x', status: 429 }))).toBe(
      SignupFailureReason.RATE_LIMITED,
    );
  });
});

describe('sign-in refusal codes', () => {
  it.each([
    ['BOT_CHECK_REQUIRED', LoginFailureReason.BOT_CHECK_REQUIRED, 'auth.botCheck.requiredTitle'],
    ['BOT_CHECK_FAILED', LoginFailureReason.BOT_CHECK_FAILED, 'auth.botCheck.failedTitle'],
  ])('%s maps to its own reason and copy', (code, reason, titleKey) => {
    expect(classifyLoginFailure(refusal(403, code))).toBe(reason);
    expect(resolveLoginFailureCopy(reason).titleKey).toBe(titleKey);
  });

  it('recognises a 428 with or without the code', () => {
    expect(isBotCheckRequiredError(refusal(428, 'BOT_CHECK_REQUIRED'))).toBe(true);
    expect(isBotCheckRequiredError(new ApiClientError({ message: 'x', status: 428 }))).toBe(true);
    expect(isBotCheckRequiredError(refusal(403, 'BOT_CHECK_FAILED'))).toBe(false);
    expect(isBotCheckRequiredError(null)).toBe(false);
  });
});

describe('submit label', () => {
  const keys = { pending: 'p', checking: 'c', idle: 'i' };
  it('shows checking while the click waits on checks, then the request label', () => {
    expect(resolveAuthSubmitLabelKey(false, false, keys)).toBe('i');
    expect(resolveAuthSubmitLabelKey(false, true, keys)).toBe('c');
    expect(resolveAuthSubmitLabelKey(true, true, keys)).toBe('c');
    expect(resolveAuthSubmitLabelKey(true, false, keys)).toBe('p');
  });
});

describe('every anti-abuse refusal is translated in all 13 locales', () => {
  const english = getDictionary(Locale.EN);

  it.each(Object.values(Locale))('%s renders every key, with its placeholders filled', (locale) => {
    const dictionary = getDictionary(locale);
    for (const { key, params } of renderedKeys()) {
      const text = resolveTranslation(dictionary, key, params);
      expect(text, `${locale}:${key}`).not.toBe(key);
      expect(text.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      expect(text, `${locale}:${key}`).not.toMatch(/\{\w+\}/u);
      if (locale !== Locale.EN) {
        expect(text, `${locale}:${key} is still English`).not.toBe(
          resolveTranslation(english, key, params),
        );
      }
    }
  });

  it('toasts translate the codes too instead of printing the backend message', () => {
    const t = (key: string): string => resolveTranslation(getDictionary(Locale.DE), key);
    for (const code of [
      'BOT_CHECK_REQUIRED',
      'BOT_CHECK_FAILED',
      'DISPOSABLE_EMAIL',
      'EMAIL_DOMAIN_UNDELIVERABLE',
      'SIGNUP_TEMPORARILY_LIMITED',
    ]) {
      const message = resolveApiErrorMessage(refusal(400, code), t, 'fallback');
      expect(message, code).not.toBe('English backend text');
      expect(message, code).not.toMatch(/^auth\./u);
    }
  });
});
