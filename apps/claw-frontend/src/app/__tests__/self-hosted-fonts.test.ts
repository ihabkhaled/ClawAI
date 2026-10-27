import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/u.test(entry.name) ? [path] : [];
  });
}

describe('fonts', () => {
  it('are self-hosted: no source file imports next/font/google (its build-time download failed CI at random)', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /from\s+['"]next\/font\/google['"]/u.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('ships every font file the app declares, with its licence beside them', () => {
    const declared = [
      ...readFileSync(join(SRC, 'app/fonts.ts'), 'utf8').matchAll(/\.\/fonts\/([\w-]+\.woff2)/gu),
    ].map((match) => match[1] as string);
    expect(declared.length).toBeGreaterThanOrEqual(9);
    for (const file of declared) {
      expect(existsSync(join(SRC, 'app/fonts', file)), file).toBe(true);
    }
    for (const licence of ['inter', 'archivo', 'ibm-plex-mono']) {
      expect(existsSync(join(SRC, `app/fonts/LICENSE-${licence}.txt`)), licence).toBe(true);
    }
  });
});
