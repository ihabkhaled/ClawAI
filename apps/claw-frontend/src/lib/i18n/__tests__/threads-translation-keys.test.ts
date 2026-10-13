import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS,
  THREAD_REPORT_REASON_LABEL_KEYS,
} from '@/constants/thread-publication.constants';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
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

function listFiles(directory: string, accept: (name: string) => boolean): string[] {
  return readdirSync(join(process.cwd(), directory))
    .filter(accept)
    .map((name) => join(directory, name));
}

const SOURCE_FILES = [
  ...listFiles('src/components/threads', (name) => name.endsWith('.tsx')),
  ...listFiles('src/hooks/threads', (name) => name.endsWith('.ts')),
  ...listFiles('src/constants', (name) => /^thread-.*\.constants\.ts$/u.test(name)),
  ...listFiles('src/utilities', (name) => /^thread-.*\.utility\.ts$/u.test(name)),
  'src/app/(portal)/threads/page.tsx',
  'src/app/(portal)/threads/review/[publicationId]/page.tsx',
  'src/hooks/chat/use-thread-detail-page.ts',
];

const LOCALES = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

function read(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8');
}

// Two shapes of literal key: the argument of t(), and any quoted `chat.`/`common.` string, which
// is how lookup tables (labelKey, translationKey, a Record value) hand a key to t() later.
const T_CALL_LITERAL = /\bt\(\s*'([A-Za-z][A-Za-z0-9.]*)'/gu;
const QUOTED_NAMESPACED_KEY = /'((?:chat|common)\.[A-Za-z][A-Za-z0-9_.]*)'/gu;
const T_CALL_TEMPLATE = /\bt\(\s*`/u;

function collectKeys(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCE_FILES) {
    const source = read(file);
    for (const match of source.matchAll(T_CALL_LITERAL)) {
      keys.add(match[1] ?? '');
    }
    for (const match of source.matchAll(QUOTED_NAMESPACED_KEY)) {
      keys.add(match[1] ?? '');
    }
  }
  keys.delete('');
  return [...keys];
}

// t() is not type-safe: a key outside its namespace renders as the raw key string.
describe('Threads UI translation keys', () => {
  const keys = collectKeys();

  it('finds the keys the Threads UI uses', () => {
    expect(keys.length).toBeGreaterThan(150);
    expect(keys).toContain('chat.threadPublicReportSPAM');
    expect(keys).toContain('chat.threadChangeRequestPENDING');
  });

  it('never builds a key with a template literal, so a dropped prefix cannot hide', () => {
    const offenders = SOURCE_FILES.filter((file) => T_CALL_TEMPLATE.test(read(file)));
    expect(offenders).toEqual([]);
  });

  for (const [locale, dictionary] of Object.entries(LOCALES)) {
    it(`resolves every key in ${locale}`, () => {
      const unresolved = keys.filter((key) => resolveTranslation(dictionary, key) === key);
      expect(unresolved).toEqual([]);
    });
  }
});

describe('Threads enum label key maps', () => {
  const maps = [
    {
      name: 'report reasons',
      values: Object.values(ThreadPublicationReportReason),
      labelKeys: THREAD_REPORT_REASON_LABEL_KEYS as Readonly<Record<string, string>>,
    },
    {
      name: 'change request statuses',
      values: Object.values(ThreadPublicationChangeRequestStatus),
      labelKeys: THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS as Readonly<Record<string, string>>,
    },
  ];

  for (const { name, values, labelKeys } of maps) {
    it(`covers every enum value of the ${name} with a chat-namespaced key`, () => {
      expect(Object.keys(labelKeys).sort()).toEqual([...values].sort());
      for (const key of Object.values(labelKeys)) {
        expect(key.startsWith('chat.')).toBe(true);
      }
    });

    for (const [locale, dictionary] of Object.entries(LOCALES)) {
      it(`translates the ${name} in ${locale}, not as a raw key`, () => {
        for (const key of Object.values(labelKeys)) {
          const text = resolveTranslation(dictionary, key);
          expect(text).not.toBe(key);
          expect(text.trim()).not.toBe('');
        }
      });
    }
  }
});
