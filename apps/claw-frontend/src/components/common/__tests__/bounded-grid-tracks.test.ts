import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Guards the property "a grid track never sizes itself to its content".
//
// `grid gap-6 lg:grid-cols-2` and plain `grid gap-3` both leave the mobile
// column implicit, and an implicit track is sized to the widest item's
// min-content. On /en/billing that made a 288px grid lay out a 350px invoice
// card, so `main` scrolled sideways at every phone width. `grid-cols-1` is
// `repeat(1, minmax(0, 1fr))`, which bounds the track to the container; the
// responsive prefixes still win from their breakpoint up, so desktop layout is
// unaffected.
//
// `grid-flow-*`, `auto-cols-*` and `grid-rows-*` opt into implicit tracks on
// purpose and are exempt.

const COMPONENTS_ROOT = join(__dirname, '..', '..');
const SOURCE_ROOT = join(COMPONENTS_ROOT, '..');
const CLASS_ATTRIBUTE = /className=(["`])([^"`]*?)\1/gu;

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectTsxFiles(fullPath);
    }
    return entry.endsWith('.tsx') ? [fullPath] : [];
  });
}

function unboundedGridClasses(source: string): string[] {
  const offenders: string[] = [];
  for (const match of source.matchAll(CLASS_ATTRIBUTE)) {
    const classes = match[2] ?? '';
    if (!/(^|\s)grid(\s|$)/u.test(classes)) {
      continue;
    }
    // A prefixed `lg:grid-cols-2` only applies from its breakpoint up; the
    // base track is still implicit, so require an unprefixed column count.
    if (/(^|\s)grid-cols-/u.test(classes)) {
      continue;
    }
    if (/grid-flow-|auto-cols-|grid-rows-/u.test(classes)) {
      continue;
    }
    offenders.push(classes);
  }
  return offenders;
}

describe('bounded grid tracks', () => {
  it('never leaves a grid column implicit', () => {
    const offenders = collectTsxFiles(SOURCE_ROOT).flatMap((file) =>
      unboundedGridClasses(readFileSync(file, 'utf8')).map((classes) => `${file}: ${classes}`),
    );

    expect(offenders).toEqual([]);
  });

  it('recognises an unbounded grid and accepts a bounded one', () => {
    expect(unboundedGridClasses('className="grid gap-6 lg:grid-cols-2"')).toHaveLength(1);
    expect(unboundedGridClasses('className="grid grid-cols-1 gap-6 lg:grid-cols-2"')).toHaveLength(
      0,
    );
    expect(unboundedGridClasses('className="grid grid-flow-col gap-2"')).toHaveLength(0);
  });
});
