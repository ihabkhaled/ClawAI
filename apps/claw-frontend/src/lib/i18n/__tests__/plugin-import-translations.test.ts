import { describe, expect, it } from 'vitest';

import {
  PLUGIN_IMPORT_ERROR_KEYS,
  PLUGIN_IMPORT_KIND_KEYS,
  PLUGIN_IMPORT_REASON_KEYS,
  PLUGIN_IMPORT_RISK_KEYS,
  PLUGIN_IMPORT_SUPPORT_KEYS,
  PLUGIN_IMPORT_WARNING_KEYS,
} from '@/constants/plugin-import.constants';
import { Locale } from '@/enums/locale.enum';
import { PLUGIN_IMPORT_TRANSLATIONS } from '@/lib/i18n/locales/plugin-import-translations';
import { PLUGIN_QA_FIXES_TRANSLATIONS } from '@/lib/i18n/locales/plugin-qa-fixes-translations';

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
const PREFIX = 'pluginImport.';
const QA_PREFIX = 'pluginQa.';
// Names that read the same in several languages.
const UNCHANGED_IN_EVERY_LOCALE = new Set(['source.github', 'source.label', 'review.source']);

describe('plugin import translations', () => {
  const english = flatten(PLUGIN_IMPORT_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGIN_IMPORT_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is a real translation',
    (locale) => {
      const translated = flatten(PLUGIN_IMPORT_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length, `${locale}: ${key}`).toBeGreaterThan(0);
        expect(placeholders(text), `${locale}: ${key}`).toEqual(placeholders(english[key] ?? ''));
        if (!UNCHANGED_IN_EVERY_LOCALE.has(key) && text.length > 24) {
          expect(text, `${locale}: ${key} is still English`).not.toBe(english[key]);
        }
      }
    },
  );

  it('defines every pluginImport key the constants point at', () => {
    const used = [
      ...Object.values(PLUGIN_IMPORT_ERROR_KEYS),
      ...Object.values(PLUGIN_IMPORT_KIND_KEYS),
      ...Object.values(PLUGIN_IMPORT_SUPPORT_KEYS),
      ...Object.values(PLUGIN_IMPORT_REASON_KEYS),
      ...Object.values(PLUGIN_IMPORT_WARNING_KEYS),
      ...Object.values(PLUGIN_IMPORT_RISK_KEYS),
    ];
    for (const key of used) {
      // The error texts added by the QA fixes live in their own file (plugin-qa-fixes-translations.ts).
      if (key.startsWith(QA_PREFIX)) {
        expect(
          flatten(PLUGIN_QA_FIXES_TRANSLATIONS[Locale.EN])[key.slice(QA_PREFIX.length)],
          key,
        ).toBeTruthy();
        continue;
      }
      expect(key.startsWith(PREFIX), key).toBe(true);
      expect(english[key.slice(PREFIX.length)], key).toBeTruthy();
    }
  });
});
