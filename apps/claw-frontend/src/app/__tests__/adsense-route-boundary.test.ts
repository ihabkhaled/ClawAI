import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_DIR = join(__dirname, '..');

function readLayout(relativePath: string): string {
  return readFileSync(join(APP_DIR, relativePath), 'utf8');
}

const ADSENSE_REFERENCE_PATTERN = /AdSenseHead|AdSenseScriptLoader|adsbygoogle/u;

/**
 * Regression guard for the AdSense "low value content" fix: the loader must
 * be reachable ONLY through the (marketing) layout. Reading source text
 * rather than rendering the tree avoids fighting next/font mocking for a
 * check that is purely about which files reference which component — see
 * rules/38-adsense-eligibility-and-low-value-content.md.
 */
describe('AdSense script route boundary', () => {
  it('is never referenced by the root layout', () => {
    expect(readLayout('layout.tsx')).not.toMatch(ADSENSE_REFERENCE_PATTERN);
  });

  it('is never referenced by the (auth) layout', () => {
    expect(readLayout('(auth)/layout.tsx')).not.toMatch(ADSENSE_REFERENCE_PATTERN);
  });

  it('is never referenced by the (portal) layout', () => {
    expect(readLayout('(portal)/layout.tsx')).not.toMatch(ADSENSE_REFERENCE_PATTERN);
  });

  it('is mounted by the (marketing) layout', () => {
    expect(readLayout('(marketing)/layout.tsx')).toMatch(/AdSenseHead/u);
  });

  it('the (payment) route group has no layout of its own to mount it from', () => {
    // If this ever starts failing because a layout.tsx was added under
    // (payment), that new file needs the same "no AdSense" assertion above.
    expect(() => readLayout('(payment)/layout.tsx')).toThrow();
  });
});
