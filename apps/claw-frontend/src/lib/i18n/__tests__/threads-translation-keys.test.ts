import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

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
import { resolveTranslation } from '@/lib/i18n/translation-resolver';

const SOURCE_FILES = [
  ...readdirSync(join(process.cwd(), 'src/components/threads'))
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => join('src/components/threads', name)),
  'src/app/(portal)/threads/page.tsx',
  'src/constants/thread-publication.constants.ts',
  'src/hooks/chat/use-thread-detail-page.ts',
  'src/hooks/threads/use-thread-publication-detail.ts',
];

const LOCALES = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

function collectKeys(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCE_FILES) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    for (const match of source.matchAll(/\bt\('([A-Za-z.]+)'|translationKey: '([A-Za-z.]+)'/gu)) {
      keys.add(match[1] ?? match[2] ?? match[3] ?? '');
    }
  }
  return [...keys];
}

// t() is not type-safe: a key outside its namespace renders as the raw key string.
describe('Threads UI translation keys', () => {
  const keys = collectKeys();

  it('finds the keys the Threads UI uses', () => {
    expect(keys.length).toBeGreaterThan(40);
  });

  for (const [locale, dictionary] of Object.entries(LOCALES)) {
    it(`resolves every key in ${locale}`, () => {
      const unresolved = keys.filter((key) => resolveTranslation(dictionary, key) === key);
      expect(unresolved).toEqual([]);
    });
  }
});
