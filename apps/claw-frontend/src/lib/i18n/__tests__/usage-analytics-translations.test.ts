import { describe, expect, it } from 'vitest';

import { KNOWN_USAGE_TOOLS } from '@/constants/usage-analytics.constants';
import { Locale } from '@/enums/locale.enum';
import { USAGE_ANALYTICS_TRANSLATIONS } from '@/lib/i18n/locales/usage-analytics-translations';

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') {
    return { [prefix]: value };
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, child]) => ({
      ...acc,
      ...flatten(child, prefix === '' ? key : `${prefix}.${key}`),
    }),
    {},
  );
}

const placeholders = (text: string): string[] => (text.match(/\{\w+\}/gu) ?? []).sort();

describe('usage analytics translations', () => {
  const english = flatten(USAGE_ANALYTICS_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(USAGE_ANALYTICS_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is not an English copy',
    (locale) => {
      const translated = flatten(USAGE_ANALYTICS_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      let identical = 0;
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text)).toEqual(placeholders(english[key] ?? ''));
        if (text === english[key]) {
          identical += 1;
        }
      }
      // A handful of short words (e.g. "Tokens") can legitimately match English.
      expect(identical).toBeLessThan(8);
    },
  );

  it('labels every tool the UI treats as known', () => {
    for (const tool of KNOWN_USAGE_TOOLS) {
      expect(english[`tools.${tool}`]).toBeTruthy();
    }
  });
});
