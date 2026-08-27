import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// The editorial marketing pages are styled entirely by a hand-written BEM
// vocabulary in globals.css, not by Tailwind utilities. A class name that never
// made it into the stylesheet is therefore invisible: the markup renders, the
// build passes, and the section is simply unstyled. That is exactly how the
// coding-agent pages shipped with `__actions`, `__list`, `__list-item`,
// `__steps`, `__code` and a `__cta--secondary` modifier that no rule defined —
// the install buttons rendered as one cream slab and every list item ran its
// title into its body.
const SOURCE_ROOT = resolve(__dirname, '../..');
const GLOBALS = resolve(__dirname, '../../../app/globals.css');
// Scanned from className attributes only, never from the file at large: the
// shell carries `id="editorial-page-heading"` for its aria-labelledby, and a
// bare name scan reads that as a class nobody styled.
//
// One flat character class rather than optional `__`/`--` groups — nesting
// quantifiers is what `security/detect-unsafe-regex` objects to, and a BEM name
// is a single run of those characters anyway.
const CLASS_ATTRIBUTE_PATTERN = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
const CLASS_PATTERN = /editorial-[a-z0-9_-]+/g;

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : collectTsxFiles(path);
    }
    return path.endsWith('.tsx') ? [path] : [];
  });
}

function usedClasses(): Set<string> {
  const used = new Set<string>();
  for (const file of collectTsxFiles(SOURCE_ROOT)) {
    for (const attribute of readFileSync(file, 'utf8').matchAll(CLASS_ATTRIBUTE_PATTERN)) {
      const value = attribute[1] ?? attribute[2] ?? '';
      for (const match of value.matchAll(CLASS_PATTERN)) {
        used.add(match[0]);
      }
    }
  }
  return used;
}

function definedClasses(): Set<string> {
  const css = readFileSync(GLOBALS, 'utf8');
  const defined = new Set<string>();
  for (const match of css.matchAll(/\.(editorial-[a-z0-9_-]+)/g)) {
    defined.add(match[1] ?? '');
  }
  return defined;
}

describe('editorial class vocabulary', () => {
  it('defines every editorial class the marketing pages use', () => {
    const missing = [...usedClasses()].filter((name) => !definedClasses().has(name)).sort();

    expect(missing).toEqual([]);
  });

  it('finds the vocabulary at all, so an empty scan cannot pass as clean', () => {
    // A path change would otherwise turn this test into a no-op that still
    // reports green.
    expect(definedClasses().size).toBeGreaterThan(20);
    expect(usedClasses().size).toBeGreaterThan(10);
  });
});
