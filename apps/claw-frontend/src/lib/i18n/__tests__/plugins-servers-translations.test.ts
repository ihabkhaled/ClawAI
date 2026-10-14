import { describe, expect, it } from 'vitest';

import {
  PLUGIN_SERVER_ERROR_KEYS,
  PLUGIN_SERVER_STATUS_KEYS,
} from '@/constants/plugin-servers.constants';
import { Locale } from '@/enums/locale.enum';
import { PLUGINS_SERVERS_TRANSLATIONS } from '@/lib/i18n/locales/plugins-servers-translations';

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
const PREFIX = 'pluginsServers.';
// German uses the English words for a tool and a name.
const UNCHANGED_IN_EVERY_LOCALE = new Set(['card.tools', 'form.nameLabel']);

describe('plugins servers translations', () => {
  const english = flatten(PLUGINS_SERVERS_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGINS_SERVERS_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is a real translation',
    (locale) => {
      const translated = flatten(PLUGINS_SERVERS_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text)).toEqual(placeholders(english[key] ?? ''));
        if (!UNCHANGED_IN_EVERY_LOCALE.has(key)) {
          expect(text, `${locale}: ${key} is still English`).not.toBe(english[key]);
        }
      }
    },
  );

  it('defines every pluginsServers key the constants point at', () => {
    const used = [
      ...Object.values(PLUGIN_SERVER_STATUS_KEYS),
      ...Object.values(PLUGIN_SERVER_ERROR_KEYS),
    ];
    for (const key of used) {
      expect(key.startsWith(PREFIX), key).toBe(true);
      expect(english[key.slice(PREFIX.length)], key).toBeTruthy();
    }
  });
});
