import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { PLUGIN_CONSENT_TRANSLATIONS } from '@/lib/i18n/locales/plugin-consent-translations';

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
/** "Plugin" and "Action" are the same word in several Latin-script languages. */
const MAY_MATCH_ENGLISH = new Set(['card.plugin', 'card.tool']);

describe('plugin consent card translations', () => {
  const english = flatten(PLUGIN_CONSENT_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGIN_CONSENT_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is a real translation',
    (locale) => {
      const translated = flatten(PLUGIN_CONSENT_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text), `${locale}: ${key}`).toEqual(placeholders(english[key] ?? ''));
        if (!MAY_MATCH_ENGLISH.has(key)) {
          expect(text, `${locale}: ${key} is still English`).not.toBe(english[key]);
        }
      }
    },
  );

  it('names the tool, the seconds and the date through placeholders, never by concatenation', () => {
    expect(english['card.timeLeft']).toContain('{value}');
    expect(english['card.confirmBody']).toContain('{value}');
    expect(english['grants.expires']).toContain('{value}');
  });
});
