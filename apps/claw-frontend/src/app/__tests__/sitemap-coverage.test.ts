import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getIndexablePages, getPublishedPages } from '@/utilities';

// Guards the property "the sitemap contains every public page in the app".
//
// The sitemap is derived from CONTENT_REGISTRY, not from the filesystem, so a
// new page added under (marketing) without a registry entry is publicly
// reachable, renders fine, and is silently absent from the sitemap and from
// robots' view of the site. Nothing else in the build catches that: the page
// compiles, the tests pass, and the only symptom is that it never gets indexed.
//
// This test walks the real route directory and asserts the registry knows about
// every route it finds.

const MARKETING_ROOT = resolve(__dirname, '../(marketing)');

// Auth and app entry points live outside (marketing) and are deliberately
// noindex, so they are not expected in the sitemap.
function collectRoutePaths(dir: string, prefix: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups "(name)" do not contribute a path segment.
      const segment = entry.name.startsWith('(') ? '' : `/${entry.name}`;
      collectRoutePaths(join(dir, entry.name), `${prefix}${segment}`, found);
    } else if (entry.name === 'page.tsx') {
      found.push(prefix === '' ? '/' : prefix);
    }
  }
  return found;
}

describe('sitemap coverage', () => {
  const routes = collectRoutePaths(MARKETING_ROOT, '');
  const publishedPaths = new Set(getPublishedPages().map((page) => page.canonicalPath));
  const indexablePaths = new Set(getIndexablePages().map((page) => page.canonicalPath));

  it('finds the public marketing routes on disk', () => {
    expect(routes.length).toBeGreaterThan(1);
    expect(routes).toContain('/');
  });

  it('has a PUBLISHED registry entry for every public page that exists', () => {
    // A page on disk with no published entry is reachable but invisible to
    // search engines — the exact failure this test exists to prevent.
    const missing = routes.filter((route) => !publishedPaths.has(route));
    expect(missing).toEqual([]);
  });

  it('lists every public page as indexable, so all of them reach the sitemap', () => {
    const missing = routes.filter((route) => !indexablePaths.has(route));
    expect(missing).toEqual([]);
  });

  it('does not publish a registry entry with no page behind it', () => {
    // The inverse mistake: a 404 in the sitemap is a crawl error on every
    // indexing pass, and search engines penalise it.
    const onDisk = new Set(routes);
    const orphaned = [...publishedPaths].filter((path) => !onDisk.has(path));
    expect(orphaned).toEqual([]);
  });
});
