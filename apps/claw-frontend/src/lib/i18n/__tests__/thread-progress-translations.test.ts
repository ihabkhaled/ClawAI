import { describe, expect, it } from 'vitest';

import { THREAD_GENERATION_CODE_KEYS } from '@/constants/thread-generation-progress.constants';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { zh } from '@/lib/i18n/locales/zh';

const OTHERS = { ar, de, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') {
    return { [prefix]: value };
  }
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, child]) => ({
      ...acc,
      ...flatten(child, prefix === '' ? key : `${prefix}.${key}`),
    }),
    {},
  );
}

function placeholders(text: string): string {
  return (text.match(/\{\w+\}/gu) ?? []).toSorted().join(',');
}

describe('chat.threadProgress translations', () => {
  const source = flatten(en.chat.threadProgress);

  it('carries a message and a hint for every known failure code', () => {
    for (const key of Object.values(THREAD_GENERATION_CODE_KEYS)) {
      expect(source[`code.${key}`]).toBeTruthy();
      expect(source[`hint.${key}`]).toBeTruthy();
    }
    expect(source['code.unknown']).toContain('{code}');
    expect(source['hint.unknown']).toBeTruthy();
  });

  it.each(Object.entries(OTHERS))(
    '%s has every key, the same placeholders, and a real translation',
    (_locale, dictionary) => {
      const translated = flatten(dictionary.chat.threadProgress);
      expect(Object.keys(translated).toSorted()).toEqual(Object.keys(source).toSorted());
      for (const [key, text] of Object.entries(translated)) {
        expect(placeholders(text), key).toBe(placeholders(source[key] ?? ''));
        expect(text.trim(), key).not.toBe('');
      }
      expect(translated.title).not.toBe(source.title);
      expect(translated['error.notFound']).not.toBe(source['error.notFound']);
    },
  );
});
