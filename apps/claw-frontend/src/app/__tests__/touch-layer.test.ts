import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Guards the property "mobile guards are pointer-based, not width-based".
//
// The 2026-08-22 regression found 2,110 mobile defects. Most of them traced to a
// single mistake: the mobile hardening was written as `max-md:`, i.e. a media
// query on `max-width: 767px`. A phone held in landscape reports 915×412 or
// 667×375, clears that breakpoint, and gets desktop sizing — 36px buttons and
// 13px form text on a touch screen. `touch:` matches `(hover: none) and
// (pointer: coarse)` as well as the narrow-window width, so both orientations
// are covered.
//
// The `.truncate` relaxation and the 16px form-control floor live in the same
// media block: a phone has no hover, so a clipped string cannot be revealed, and
// Safari zooms the whole page when a focused control computes under 16px.

const APP_DIRECTORY = join(__dirname, '..');
const SOURCE_DIRECTORY = join(APP_DIRECTORY, '..');
const GLOBALS_CSS = readFileSync(join(APP_DIRECTORY, 'globals.css'), 'utf8');

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      // Test files quote the old guard when asserting it is gone.
      return entry === '__tests__' ? [] : collectSourceFiles(fullPath);
    }
    return /\.tsx?$/u.test(entry) ? [fullPath] : [];
  });
}

describe('touch layer', () => {
  it('declares the touch variant against the pointer, not only the width', () => {
    expect(GLOBALS_CSS).toContain('@custom-variant touch');
    expect(GLOBALS_CSS).toContain('(hover: none) and (pointer: coarse), (max-width: 767px)');
  });

  it('floors every mobile form control at 16px so Safari does not zoom on focus', () => {
    expect(GLOBALS_CSS).toMatch(
      /\[contenteditable='true'\][\s\S]{0,80}font-size: max\(1rem, 1em\)/u,
    );
  });

  it('gives every coarse-pointer control a 44px minimum target', () => {
    expect(GLOBALS_CSS).toMatch(/\[role='combobox'\][\s\S]{0,200}min-height: 2\.75rem/u);
  });

  it('lets truncated text wrap on a device that cannot hover to reveal it', () => {
    expect(GLOBALS_CSS).toMatch(
      /\.truncate,\s*\n\s*\.text-ellipsis \{[\s\S]{0,160}white-space: normal/u,
    );
  });

  it('has no width-only mobile guard left anywhere in the frontend source', () => {
    const offenders = collectSourceFiles(SOURCE_DIRECTORY).filter((file) =>
      readFileSync(file, 'utf8').includes('max-md:'),
    );

    expect(offenders).toEqual([]);
  });
});
