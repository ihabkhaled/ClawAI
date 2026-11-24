import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';

/** Allowed to equal the English text: format names and a unit. */
const IDENTICAL_ALLOWED = new Set([
  'history.exportPdf',
  'history.exportMarkdown',
  'admin.latencyValue',
  // "Video" and "Live & Videos" are the German and Italian words too (2026-11-24).
  'modal.videoBadge',
  'nav.live',
]);

function flatten(node: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof node !== 'object' || node === null) {
    return result;
  }
  for (const [key, value] of Object.entries(node)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      result[path] = value;
    } else {
      Object.assign(result, flatten(value, path));
    }
  }
  return result;
}

function placeholders(text: string): string[] {
  return (text.match(/\{[a-z]+\}/giu) ?? []).toSorted();
}

const EN = flatten(LIVE_TRANSLATIONS.en);

describe('live translations', () => {
  it.each(Object.values(Locale))('%s has every key with the same placeholders', (locale) => {
    const dictionary = flatten(LIVE_TRANSLATIONS[locale]);
    expect(Object.keys(dictionary).toSorted()).toEqual(Object.keys(EN).toSorted());
    for (const [key, value] of Object.entries(dictionary)) {
      expect(value.trim(), `${locale}.${key}`).not.toBe('');
      expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(EN[key] ?? ''));
    }
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s is translated, not an English copy',
    (locale) => {
      const dictionary = flatten(LIVE_TRANSLATIONS[locale]);
      const copied = Object.entries(dictionary)
        .filter(([key, value]) => !IDENTICAL_ALLOWED.has(key) && value === EN[key])
        .map(([key]) => key);
      expect(copied).toEqual([]);
    },
  );
});
