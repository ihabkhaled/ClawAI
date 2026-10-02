import { describe, expect, it } from 'vitest';

import { RATE_LIMIT_COPY_KEYS } from '@/constants/rate-limit.constants';
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
  isRateLimitedError,
  parseRetryAfterSeconds,
  readRetryAfterSeconds,
  resolveRateLimitMessage,
  translateRateLimitError,
} from '@/utilities/rate-limit.utility';

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

function limited(retryAfterSeconds?: number, code: string | undefined = 'RATE_LIMITED') {
  return new ApiClientError({ message: 'Too many', status: 429, code, retryAfterSeconds });
}

describe('parseRetryAfterSeconds', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfterSeconds('412')).toBe(412);
    expect(parseRetryAfterSeconds(' 0 ')).toBe(0);
    expect(parseRetryAfterSeconds(7.2)).toBe(8);
  });

  it('reads an HTTP-date relative to now, never negative', () => {
    const now = Date.parse('2026-10-02T10:00:00Z');
    expect(parseRetryAfterSeconds('Fri, 02 Oct 2026 10:02:00 GMT', now)).toBe(120);
    expect(parseRetryAfterSeconds('Fri, 02 Oct 2026 09:00:00 GMT', now)).toBe(0);
  });

  it('ignores anything else', () => {
    expect(parseRetryAfterSeconds(undefined)).toBeUndefined();
    expect(parseRetryAfterSeconds('')).toBeUndefined();
    expect(parseRetryAfterSeconds('soon')).toBeUndefined();
    expect(parseRetryAfterSeconds(-3)).toBeUndefined();
    expect(parseRetryAfterSeconds(['1'])).toBeUndefined();
  });
});

describe('isRateLimitedError', () => {
  it('matches RATE_LIMITED and a bare 429 (nginx)', () => {
    expect(isRateLimitedError(limited(5))).toBe(true);
    expect(isRateLimitedError(limited(5, undefined))).toBe(true);
  });

  it('leaves a 429 with its own code, and other errors, alone', () => {
    expect(isRateLimitedError(limited(5, 'EMAIL_CHANGE_DAILY_LIMIT'))).toBe(false);
    expect(isRateLimitedError(new ApiClientError({ message: 'x', status: 401 }))).toBe(false);
    expect(isRateLimitedError(null)).toBe(false);
    expect(isRateLimitedError(new Error('x'))).toBe(false);
  });
});

describe('readRetryAfterSeconds', () => {
  it('returns the header seconds or null', () => {
    expect(readRetryAfterSeconds(limited(90))).toBe(90);
    expect(readRetryAfterSeconds(limited())).toBeNull();
    expect(readRetryAfterSeconds('nope')).toBeNull();
  });
});

describe('resolveRateLimitMessage', () => {
  it('rounds UP to whole minutes so nobody retries early', () => {
    expect(resolveRateLimitMessage(61)).toEqual({
      key: RATE_LIMIT_COPY_KEYS.inMinutes,
      params: { minutes: 2 },
    });
    expect(resolveRateLimitMessage(840)).toEqual({
      key: RATE_LIMIT_COPY_KEYS.inMinutes,
      params: { minutes: 14 },
    });
  });

  it('says "a minute" for anything up to 60 seconds, including 0', () => {
    expect(resolveRateLimitMessage(1)).toEqual({ key: RATE_LIMIT_COPY_KEYS.inOneMinute });
    expect(resolveRateLimitMessage(60)).toEqual({ key: RATE_LIMIT_COPY_KEYS.inOneMinute });
    expect(resolveRateLimitMessage(0)).toEqual({ key: RATE_LIMIT_COPY_KEYS.inOneMinute });
  });

  it('falls back to the generic copy without a header', () => {
    expect(resolveRateLimitMessage(null)).toEqual({ key: RATE_LIMIT_COPY_KEYS.fallback });
  });
});

describe('translateRateLimitError', () => {
  const t = (key: string, params?: Record<string, string | number>): string =>
    `${key}${params ? JSON.stringify(params) : ''}`;

  it('translates a 429 with the minutes', () => {
    expect(translateRateLimitError(limited(300), t)).toBe(
      `${RATE_LIMIT_COPY_KEYS.inMinutes}{"minutes":5}`,
    );
  });

  it('returns null for any other error', () => {
    expect(translateRateLimitError(new Error('boom'), t)).toBeNull();
  });
});

describe('rate-limit copy exists in every locale', () => {
  it.each(Object.entries(LOCALES))('%s has real, interpolating copy', (_code, dictionary) => {
    for (const key of Object.values(RATE_LIMIT_COPY_KEYS)) {
      const value = lookup(dictionary, key);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
    expect(lookup(dictionary, RATE_LIMIT_COPY_KEYS.inMinutes)).toContain('{minutes}');
  });

  it('is actually translated, not English copied into other locales', () => {
    for (const [code, dictionary] of Object.entries(LOCALES)) {
      if (code === 'en') {
        continue;
      }
      expect(lookup(dictionary, RATE_LIMIT_COPY_KEYS.inMinutes)).not.toBe(
        lookup(en, RATE_LIMIT_COPY_KEYS.inMinutes),
      );
    }
  });
});
