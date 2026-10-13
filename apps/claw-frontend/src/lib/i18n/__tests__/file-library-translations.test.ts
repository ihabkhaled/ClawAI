import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { FILE_LIBRARY_TRANSLATIONS } from '@/lib/i18n/locales/file-library-translations';
import { getTranslation } from '@/lib/i18n/translations';

const ALL_LOCALES = Object.values(Locale);
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

function flatten(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') {
    return [[prefix, value]];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

describe('chat.fileLibrary translations', () => {
  const english = flatten(FILE_LIBRARY_TRANSLATIONS[Locale.EN]);

  it.each(ALL_LOCALES)(
    '%s has every key, filled in, with the same placeholders as English',
    (locale) => {
      const entries = new Map(flatten(FILE_LIBRARY_TRANSLATIONS[locale]));
      for (const [key, englishText] of english) {
        const text = entries.get(key);
        expect(text, `${locale} is missing ${key}`).toBeTruthy();
        expect(placeholders(text ?? ''), `${locale} ${key} placeholders`).toEqual(
          placeholders(englishText),
        );
      }
    },
  );

  it.each(ALL_LOCALES.filter((locale) => locale !== Locale.EN))(
    '%s is a real translation of the visible labels, not English copied across',
    (locale) => {
      expect(FILE_LIBRARY_TRANSLATIONS[locale].upload).not.toBe(
        FILE_LIBRARY_TRANSLATIONS[Locale.EN].upload,
      );
      expect(FILE_LIBRARY_TRANSLATIONS[locale].browseAll).not.toBe(
        FILE_LIBRARY_TRANSLATIONS[Locale.EN].browseAll,
      );
    },
  );

  it.each(ALL_LOCALES)('%s is reachable through the dictionary at chat.fileLibrary', (locale) => {
    const resolved = getTranslation(locale, 'chat.fileLibrary.dialog.attachCount', { count: 3 });

    expect(resolved).toBe(
      FILE_LIBRARY_TRANSLATIONS[locale].dialog.attachCount.replace('{count}', '3'),
    );
  });
});
