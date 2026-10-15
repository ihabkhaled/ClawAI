import { describe, expect, it } from 'vitest';

import { THREAD_FORMAT_CODE_KEYS } from '@/constants/thread-format.constants';
import { Locale } from '@/enums/locale.enum';
import { THREAD_REVIEW_TRANSLATIONS } from '@/lib/i18n/locales/thread-review-translations';

const LOCALES = Object.values(Locale);
const english = THREAD_REVIEW_TRANSLATIONS[Locale.EN];

describe('threadReview translations', () => {
  it('has every key, filled, in all 13 locales', () => {
    expect(LOCALES).toHaveLength(13);
    for (const locale of LOCALES) {
      const entry = THREAD_REVIEW_TRANSLATIONS[locale];
      expect(Object.keys(entry).sort()).toEqual(Object.keys(english).sort());
      for (const value of Object.values(entry)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has a sentence for every FORMAT_ skip code', () => {
    expect(Object.keys(THREAD_FORMAT_CODE_KEYS)).toHaveLength(15);
    for (const key of Object.values(THREAD_FORMAT_CODE_KEYS)) {
      expect(Object.keys(english)).toContain(key.replace('threadReview.', ''));
    }
  });

  it('keeps the {code} placeholder of the unknown-code line and translates it', () => {
    for (const locale of LOCALES) {
      expect(THREAD_REVIEW_TRANSLATIONS[locale].formatUnknown).toContain('{code}');
      if (locale !== Locale.EN) {
        expect(THREAD_REVIEW_TRANSLATIONS[locale].formatAlreadyPretty).not.toBe(
          english.formatAlreadyPretty,
        );
      }
    }
  });
});
