import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/locales/en';

// Guards the failure mode that shipped `marketing.architecturePage.hero.title`
// as visible UI text.
//
// `t()` takes a plain `string`, not `keyof TranslationDictionary`, so calling a
// key that does not exist is not a type error — at runtime the raw key is
// rendered to the user. A locale-vs-locale key diff cannot catch it either:
// when the key is missing from en.ts as well, all nine locales agree and the
// diff is clean.
//
// So the check has to run the other way round: every key REFERENCED IN CODE
// must exist in the dictionary.

const SRC = resolve(__dirname, '../../..');

// t('a.b.c') plus the *Key prop/field convention (titleKey, subtitleKey,
// labelKey, headingKey, …) used by the marketing components.
const KEY_PATTERNS: RegExp[] = [
  /\bt\(\s*'([a-zA-Z][\w.]*)'/g,
  /\bt\(\s*"([a-zA-Z][\w.]*)"/g,
  /\b\w*Key\s*[:=]\s*'([a-zA-Z][\w.]*)'/g,
  /\b\w*Key\s*=\s*"([a-zA-Z][\w.]*)"/g,
];

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Locale files are the dictionary itself, and __tests__ may reference
      // deliberately-missing keys to assert fallback behaviour.
      if (entry.name === 'node_modules' || entry.name === 'locales' || entry.name === '__tests__') {
        continue;
      }
      collectSourceFiles(full, found);
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function flattenKeys(value: unknown, prefix: string, out: Set<string>): Set<string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out.add(prefix);
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

describe('i18n key references', () => {
  const known = flattenKeys(en, '', new Set<string>());
  const files = collectSourceFiles(SRC);

  it('finds source files and dictionary keys to compare', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(known.size).toBeGreaterThan(1000);
  });

  it('every i18n key used in code exists in the dictionary', () => {
    const dangling: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of KEY_PATTERNS) {
        pattern.lastIndex = 0;
        let match = pattern.exec(source);
        while (match !== null) {
          const key = match[1];
          // Only dotted paths are i18n keys; bare identifiers are query keys,
          // React keys and similar.
          if (key !== undefined && key.includes('.') && !known.has(key)) {
            dangling.push(`${key}  ←  ${relative(SRC, file).replaceAll('\\', '/')}`);
          }
          match = pattern.exec(source);
        }
      }
    }

    // Printed in full on failure: a bare count would not say which key or where.
    expect(dangling).toEqual([]);
  });
});
