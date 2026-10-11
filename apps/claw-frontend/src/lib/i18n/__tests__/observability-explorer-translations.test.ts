import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { OBSERVABILITY_EXPLORER_TRANSLATIONS } from '@/lib/i18n/locales/observability-explorer-translations';

const placeholders = (text: string): string[] => (text.match(/\{\w+\}/gu) ?? []).sort();
const SRC = path.resolve(__dirname, '../../..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (entry === '__tests__') {
      return [];
    }
    return statSync(full).isDirectory() ? sourceFiles(full) : [full];
  });
}

describe('observability explorer translations', () => {
  const english: Record<string, string> = { ...OBSERVABILITY_EXPLORER_TRANSLATIONS[Locale.EN] };

  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(OBSERVABILITY_EXPLORER_TRANSLATIONS).sort()).toEqual(
      Object.values(Locale).sort(),
    );
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has every key, keeps every placeholder, and is not an English copy',
    (locale) => {
      const translated: Record<string, string> = { ...OBSERVABILITY_EXPLORER_TRANSLATIONS[locale] };
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      let identical = 0;
      for (const [key, text] of Object.entries(translated)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text)).toEqual(placeholders(english[key] ?? ''));
        if (text === english[key]) {
          identical += 1;
        }
      }
      // Identifiers and cognates (p95, Action, Source, Workflow, Page) legitimately match English.
      expect(identical).toBeLessThan(10);
    },
  );

  it('resolves every observabilityExplorer.* key the UI asks for', () => {
    const roots = [
      path.join(SRC, 'components/observability'),
      path.join(SRC, 'components/charts'),
      path.join(SRC, 'hooks/observability'),
      path.join(SRC, 'constants'),
      path.join(SRC, 'utilities'),
    ];
    const used = new Set<string>();
    for (const file of roots.flatMap((root) => sourceFiles(root))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/['"`]observabilityExplorer\.(\w+)['"`]/gu)) {
        const key = match[1];
        if (key !== undefined) {
          used.add(key);
        }
      }
    }
    expect(used.size).toBeGreaterThan(50);
    const missing = [...used].filter((key) => english[key] === undefined);
    expect(missing).toEqual([]);
  });

  it('has no unused keys (every translated string is reachable)', () => {
    const roots = [
      path.join(SRC, 'components/observability'),
      path.join(SRC, 'constants'),
      path.join(SRC, 'utilities'),
    ];
    const text = roots
      .flatMap((root) => sourceFiles(root))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    const unused = Object.keys(english).filter(
      (key) => !text.includes(`observabilityExplorer.${key}`),
    );
    expect(unused).toEqual([]);
  });
});
