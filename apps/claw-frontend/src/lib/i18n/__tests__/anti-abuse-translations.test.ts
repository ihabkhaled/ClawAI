import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ANTI_ABUSE_TRANSLATIONS } from '@/lib/i18n/locales/anti-abuse-translations';
import { getDictionary } from '@/lib/i18n/translations';

const PLACEHOLDER = /\{(\w+)\}/gu;

function flatten(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (typeof inner === 'string') {
      out[`${prefix}${key}`] = inner;
    } else {
      Object.assign(out, flatten(inner, `${prefix}${key}.`));
    }
  }
  return out;
}

const placeholders = (text: string): string[] =>
  [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '').sort();

const english = flatten(ANTI_ABUSE_TRANSLATIONS[Locale.EN]);

describe('anti-abuse translations', () => {
  it('defines all 13 locales', () => {
    expect(Object.keys(ANTI_ABUSE_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale))(
    '%s has every key, no empty value and the same placeholders',
    (locale) => {
      const flat = flatten(ANTI_ABUSE_TRANSLATIONS[locale]);
      expect(Object.keys(flat).sort()).toEqual(Object.keys(english).sort());
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('');
        expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(english[key] ?? ''));
      }
    },
  );

  it.each(Object.values(Locale))('%s wires the copy into its dictionary', (locale) => {
    const dictionary = getDictionary(locale);
    const entry = ANTI_ABUSE_TRANSLATIONS[locale];
    expect(dictionary.auth.botCheck).toBe(entry.auth);
    expect(dictionary.adminSecurity).toBe(entry.admin);
    expect(dictionary.nav.adminSecuritySignup).toBe(entry.navigationLabel);
  });
});
