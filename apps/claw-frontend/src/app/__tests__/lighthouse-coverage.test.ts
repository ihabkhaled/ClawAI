import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getIndexablePages } from '@/utilities';
import { parseLocaleFromPathname, stripLocaleFromPathname } from '@/utilities/locale.utility';

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

function readConfig(file: string): LighthouseConfig {
  return JSON.parse(
    readFileSync(resolve(__dirname, `../../../${file}`), 'utf8'),
  ) as LighthouseConfig;
}

const config = readConfig('lighthouserc.json');
const prConfig = readConfig('lighthouserc.pr.json');

const auditedPaths = config.ci.collect.url.map((url) => new URL(url).pathname);
const auditedContentPaths = auditedPaths.map(stripLocaleFromPathname);

/** The group a URL belongs to: its first path segment after the locale. */
function groupOf(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean)[1] ?? '';
}

describe('lighthouse coverage', () => {
  it('audits every indexable public page', () => {
    const indexable = getIndexablePages().map((page) => page.canonicalPath);
    const missing = indexable.filter((path) => !auditedContentPaths.includes(path));
    expect(missing).toEqual([]);
  });

  it('does not audit a URL with no page behind it', () => {
    const indexable = new Set(getIndexablePages().map((page) => page.canonicalPath));
    const orphaned = auditedContentPaths.filter((path) => !indexable.has(path));
    expect(orphaned).toEqual([]);
  });

  it('audits canonical locale-prefixed URLs only', () => {
    expect(auditedPaths.every((path) => parseLocaleFromPathname(path) !== null)).toBe(true);
  });

  it('runs each URL more than once so a single flaky sample cannot gate a merge', () => {
    expect(config.ci.collect.numberOfRuns).toBeGreaterThan(1);
  });
});

// Pull requests audit a derived sample rather than the full set: the run is
// linear in URL count at a measured ~13.9 s per audit, and `minScore: 1` means
// one bad audit in the set fails the whole run. Sampling keeps PR feedback fast
// and the flake surface small; `main` still audits everything, so nothing ships
// ungated.
//
// The risk of a sample is that a whole cluster silently falls out of it. These
// assertions are what makes that impossible.
describe('lighthouse pull-request sample', () => {
  const prUrls = prConfig.ci.collect.url;
  const fullUrls = config.ci.collect.url;

  it('is a strict subset of the full audit set', () => {
    const full = new Set(fullUrls);
    expect(prUrls.filter((url) => !full.has(url))).toEqual([]);
  });

  it('keeps every group represented, so no cluster loses its gate', () => {
    const fullGroups = new Set(fullUrls.map(groupOf));
    const prGroups = new Set(prUrls.map(groupOf));
    expect([...fullGroups].filter((group) => !prGroups.has(group))).toEqual([]);
  });

  it('caps each group so a large cluster cannot dominate the sample', () => {
    const counts = new Map<string, number>();
    for (const url of prUrls) {
      const group = groupOf(url);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    expect([...counts.values()].every((count) => count <= 2)).toBe(true);
  });

  it('is current — regenerate with tools/lighthouse/build-pr-config.mjs', () => {
    // The sample is derived, never hand-edited. Without this assertion the two
    // files drift, and the drift is invisible until an unaudited page ships a
    // contrast failure to production.
    const seen = new Map<string, number>();
    const expected = fullUrls.filter((url) => {
      const group = groupOf(url);
      const count = seen.get(group) ?? 0;
      if (count >= 2) {
        return false;
      }
      seen.set(group, count + 1);
      return true;
    });
    expect(prUrls).toEqual(expected);
  });

  it('shares the assertions of the full config', () => {
    expect(prConfig.ci.collect.numberOfRuns).toBe(config.ci.collect.numberOfRuns);
  });
});
