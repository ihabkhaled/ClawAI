import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getIndexablePages } from '@/utilities';

// Lighthouse gates accessibility, best-practices and SEO as hard errors, but
// only for the URLs it is told to visit. When six topic pages were published,
// the config still listed two — so the new pages shipped with no a11y or SEO
// gate at all, and nothing failed to say so.
//
// This ties the audited set to the published set, in both directions: a new
// public page must be added to the config, and a URL in the config must
// correspond to a real indexable page (otherwise the run 404s and the whole
// audit reports a misleading score).

type LighthouseConfig = {
  ci: { collect: { url: string[]; numberOfRuns: number } };
};

const config = JSON.parse(
  readFileSync(resolve(__dirname, '../../../lighthouserc.json'), 'utf8'),
) as LighthouseConfig;

const auditedPaths = config.ci.collect.url.map((url) => new URL(url).pathname);

describe('lighthouse coverage', () => {
  it('audits every indexable public page', () => {
    const indexable = getIndexablePages().map((page) => page.canonicalPath);
    const missing = indexable.filter((path) => !auditedPaths.includes(path));
    expect(missing).toEqual([]);
  });

  it('does not audit a URL with no page behind it', () => {
    const indexable = new Set(getIndexablePages().map((page) => page.canonicalPath));
    const orphaned = auditedPaths.filter((path) => !indexable.has(path));
    expect(orphaned).toEqual([]);
  });

  it('runs each URL more than once so a single flaky sample cannot gate a merge', () => {
    expect(config.ci.collect.numberOfRuns).toBeGreaterThan(1);
  });
});
