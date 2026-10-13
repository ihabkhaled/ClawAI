import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { MARKETING_VIDEOS_TRANSLATIONS } from '@/lib/i18n/locales/marketing-videos-translations';
import { getTranslation } from '@/lib/i18n/translations';

const PLACEHOLDER_PATTERN = /\{[a-z]+\}/gu;

function flatten(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[prefix, value]];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix === '' ? key : `${prefix}.${key}`),
    );
  }
  return [];
}

const english = flatten(MARKETING_VIDEOS_TRANSLATIONS[Locale.EN]);
const englishKeys = english.map(([key]) => key);

describe('marketing video translations', () => {
  it('covers all 13 locales', () => {
    expect(Object.keys(MARKETING_VIDEOS_TRANSLATIONS).toSorted()).toEqual(
      Object.values(Locale).toSorted(),
    );
  });

  it.each(Object.values(Locale))('%s has exactly the English keys, all non-empty', (locale) => {
    const entries = flatten(MARKETING_VIDEOS_TRANSLATIONS[locale]);

    expect(entries.map(([key]) => key)).toEqual(englishKeys);
    for (const [key, text] of entries) {
      expect(text.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
    }
  });

  it.each(Object.values(Locale))('%s keeps the same placeholders as English', (locale) => {
    const entries = new Map(flatten(MARKETING_VIDEOS_TRANSLATIONS[locale]));

    for (const [key, text] of english) {
      const expected = (text.match(PLACEHOLDER_PATTERN) ?? []).toSorted();
      const actual = (entries.get(key)?.match(PLACEHOLDER_PATTERN) ?? []).toSorted();
      expect(actual, `${locale} ${key}`).toEqual(expected);
    }
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s is a real translation, not the English text',
    (locale) => {
      const entries = new Map(flatten(MARKETING_VIDEOS_TRANSLATIONS[locale]));
      const copied = english.filter(([key, text]) => entries.get(key) === text).map(([key]) => key);

      expect(copied).toEqual([]);
    },
  );

  it.each(Object.values(Locale))(
    '%s is mounted at marketing.videos in the dictionary',
    (locale) => {
      expect(getTranslation(locale, 'marketing.videos.action.title')).toBe(
        MARKETING_VIDEOS_TRANSLATIONS[locale].action.title,
      );
      expect(getTranslation(locale, 'marketing.videos.facade.play')).toBe(
        MARKETING_VIDEOS_TRANSLATIONS[locale].facade.play,
      );
    },
  );

  it('claims nothing about what the clips show or which language they speak', () => {
    expect(englishKeys.filter((key) => /^(language|shorts|stepLabel)(\.|$)/u.test(key))).toEqual(
      [],
    );
    expect(englishKeys).toContain('local.part.title');
    expect(englishKeys).toContain('local.part.description');
  });

  it.each(Object.values(Locale))('%s numbers the neutral part title', (locale) => {
    const { title } = MARKETING_VIDEOS_TRANSLATIONS[locale].local.part;

    expect(title).toContain('{n}');
    expect(title).toContain('{total}');
  });
});
