import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { en } from '@/lib/i18n/locales/en';
import { THREAD_ACCEPTED_GAPS_TRANSLATIONS } from '@/lib/i18n/locales/thread-accepted-gaps-translations';
import { getTranslation } from '@/lib/i18n/translations';

const english = THREAD_ACCEPTED_GAPS_TRANSLATIONS[Locale.EN];
const keys = Object.keys(english);
const locales = Object.values(Locale);

describe('THREAD_ACCEPTED_GAPS_TRANSLATIONS', () => {
  it('has all 13 locales with the same keys, none empty and no placeholder', () => {
    expect(locales).toHaveLength(13);
    for (const locale of locales) {
      const entry: Record<string, string> = THREAD_ACCEPTED_GAPS_TRANSLATIONS[locale];
      expect(Object.keys(entry).toSorted(), locale).toEqual(keys.toSorted());
      for (const key of keys) {
        expect(entry[key]?.trim(), `${locale}.${key}`).toBeTruthy();
        expect(entry[key], `${locale}.${key}`).not.toMatch(/\{[a-zA-Z]+\}/u);
      }
    }
  });

  it.each(locales.filter((locale) => locale !== Locale.EN))(
    '%s has its own wording, not the English text',
    (locale) => {
      const entry: Record<string, string> = THREAD_ACCEPTED_GAPS_TRANSLATIONS[locale];
      const source: Record<string, string> = english;
      expect(
        keys.filter((key) => entry[key] === source[key]),
        locale,
      ).toEqual([]);
    },
  );

  it('is part of the chat dictionary in every locale', () => {
    expect(en.chat.threadGapsRemedyAccept).toBe('Accept these gaps and write it honestly');
    expect(en.chat.threadGapsExplain).toBe(
      'The article will say clearly what could not be found. Reviewers will still check everything else.',
    );
    for (const locale of locales) {
      const entry: Record<string, string> = THREAD_ACCEPTED_GAPS_TRANSLATIONS[locale];
      for (const key of keys) {
        expect(getTranslation(locale, `chat.${key}`), `${locale}.${key}`).toBe(entry[key]);
      }
    }
  });
});
