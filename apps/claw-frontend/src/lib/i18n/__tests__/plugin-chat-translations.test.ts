import { describe, expect, it } from 'vitest';

import { PLUGIN_CALL_STATUS_KEYS, PLUGIN_NOTICE_KEYS } from '@/constants/plugin-call.constants';
import { Locale } from '@/enums/locale.enum';
import { PLUGIN_CHAT_TRANSLATIONS } from '@/lib/i18n/locales/plugin-chat-translations';

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
const PREFIX = 'pluginChat.';

describe('plugin chat translations (the @ picker, call timeline and notices)', () => {
  const english = flatten(PLUGIN_CHAT_TRANSLATIONS[Locale.EN]);

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGIN_CHAT_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is a real translation',
    (locale) => {
      const translated = flatten(PLUGIN_CHAT_TRANSLATIONS[locale]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text), `${locale}: ${key}`).toEqual(placeholders(english[key] ?? ''));
        // "pluginChat.calls.duration" is a bare unit and may match in a few scripts.
        if (key !== 'calls.duration') {
          expect(text, `${locale}: ${key} is still English`).not.toBe(english[key]);
        }
      }
    },
  );

  it('defines every pluginChat key the call timeline and the notices point at', () => {
    const used = [...Object.values(PLUGIN_CALL_STATUS_KEYS), ...Object.values(PLUGIN_NOTICE_KEYS)];
    expect(used.length).toBe(10);
    for (const key of used) {
      expect(key.startsWith(PREFIX), key).toBe(true);
      expect(english[key.slice(PREFIX.length)], key).toBeTruthy();
    }
  });

  it('names a plugin and a count through placeholders, never by concatenation', () => {
    expect(english['mention.removeChip']).toContain('{value}');
    expect(english['mention.count']).toContain('{value}');
    expect(english['calls.duration']).toContain('{value}');
  });
});
