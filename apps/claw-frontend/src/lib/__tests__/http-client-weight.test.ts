import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = resolve(__dirname, '..', '..');
const ENTRY = resolve(SRC_ROOT, 'lib/http-client.ts');
const HEAVY = ['content-registry.utility', 'content-registry.constants', 'public-page-seo'];
const IMPORT =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gu;

function resolveSpecifier(from: string, specifier: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith('@/')) {
    base = resolve(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = resolve(dirname(from), specifier);
  }
  if (base === null) {
    return null;
  }
  for (const candidate of [`${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Every first-party file the HTTP client reaches through value imports (type-only imports erase). */
function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT)) {
      const whole = match[0];
      if (/^(?:import|export)\s+type\s/u.test(whole)) {
        continue;
      }
      const target = resolveSpecifier(file, match[1] ?? match[2] ?? '');
      if (target !== null) {
        queue.push(target);
      }
    }
  }
  return seen;
}

describe('the shared HTTP client bundle weight', () => {
  it('never reaches the marketing content registry (megabytes of prose in 13 languages)', () => {
    const reached = [...reachableFrom(ENTRY)].map((file) =>
      file.split(String.fromCharCode(92)).join('/'),
    );
    const heavy = reached.filter((file) => HEAVY.some((marker) => file.includes(marker)));
    expect(heavy).toEqual([]);
  });
});
