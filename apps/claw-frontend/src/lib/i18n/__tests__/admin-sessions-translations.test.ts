import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ADMIN_SESSIONS_TRANSLATIONS } from '@/lib/i18n/locales/admin-sessions-translations';

const PLACEHOLDER = /\{(\w+)\}/g;

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

const english = flatten(ADMIN_SESSIONS_TRANSLATIONS[Locale.EN].section);

describe('admin sessions translations', () => {
  it('defines the page for all 13 locales', () => {
    expect(Object.keys(ADMIN_SESSIONS_TRANSLATIONS)).toHaveLength(13);
  });

  it.each(Object.values(Locale))(
    '%s has every key, no empty value and the same placeholders',
    (locale) => {
      const entry = ADMIN_SESSIONS_TRANSLATIONS[locale];
      expect(entry.navigationLabel.length).toBeGreaterThan(0);
      const flat = flatten(entry.section);
      expect(Object.keys(flat).sort()).toEqual(Object.keys(english).sort());
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('');
        expect(
          [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort(),
          `${locale}.${key}`,
        ).toEqual([...(english[key] ?? '').matchAll(PLACEHOLDER)].map((m) => m[1]).sort());
      }
    },
  );

  it('keeps the typed phrase in the label, never translated', () => {
    for (const locale of Object.values(Locale)) {
      expect(ADMIN_SESSIONS_TRANSLATIONS[locale].section.phraseLabel).toContain('{phrase}');
    }
  });
});
