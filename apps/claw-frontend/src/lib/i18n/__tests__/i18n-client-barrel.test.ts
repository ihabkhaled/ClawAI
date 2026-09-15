import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const BARREL = resolve(process.cwd(), 'src/lib/i18n/index.ts');

describe('the client i18n barrel', () => {
  it('never re-exports the module that holds all 13 dictionaries', () => {
    // `translations.ts` statically imports 5 MB of locale source. This barrel
    // is imported by nearly every client component for useTranslation, so
    // re-exporting it puts every language in the shared client chunk — a
    // visitor reading English downloading Arabic, Thai and Japanese.
    //
    // Asserted against the source because the defect is an import EDGE, which
    // a render test cannot see.
    expect(readFileSync(BARREL, 'utf8')).not.toContain("from './translations'");
  });

  it('still exports what client components actually use', () => {
    const source = readFileSync(BARREL, 'utf8');
    for (const name of ['useTranslation', 'useLocale', 'LocaleProvider', 'SUPPORTED_LOCALES']) {
      expect(source).toContain(name);
    }
  });
});
