import { describe, expect, it } from 'vitest';

import {
  PLUGIN_CATALOG_STATUS_KEYS,
  PLUGIN_ERROR_KEY_CREDENTIAL_FAILED,
  PLUGIN_ERROR_KEYS,
  PLUGIN_GATE_REASON_KEYS,
  PLUGIN_VALIDATION_KEYS,
} from '@/constants/plugin-installs.constants';
import { Locale } from '@/enums/locale.enum';
import { PLUGINS_STATUS_TRANSLATIONS } from '@/lib/i18n/locales/plugins-status-translations';

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
const PREFIX = 'pluginsStatus.';

describe('plugins status translations', () => {
  const english = flatten(PLUGINS_STATUS_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGINS_STATUS_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is a real translation',
    (locale) => {
      const translated = flatten(PLUGINS_STATUS_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text)).toEqual(placeholders(english[key] ?? ''));
        expect(text, `${locale}: ${key} is still English`).not.toBe(english[key]);
      }
    },
  );

  it('defines every pluginsStatus key the plugin constants point at', () => {
    const used = [
      ...Object.values(PLUGIN_CATALOG_STATUS_KEYS),
      ...Object.values(PLUGIN_ERROR_KEYS),
      ...Object.values(PLUGIN_GATE_REASON_KEYS),
      ...Object.values(PLUGIN_VALIDATION_KEYS),
      PLUGIN_ERROR_KEY_CREDENTIAL_FAILED,
    ].filter((key): key is string => key !== null && key.startsWith(PREFIX));
    expect(used.length).toBeGreaterThanOrEqual(8);
    for (const key of used) {
      expect(english[key.slice(PREFIX.length)], key).toBeTruthy();
    }
  });
});
