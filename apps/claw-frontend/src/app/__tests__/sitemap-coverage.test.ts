import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DATA_DRIVEN_MARKETING_ROUTES,
  SEO_CLUSTER_ROUTE_EXPANSIONS,
} from '@/constants/seo-cluster-routes.constants';
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

/**
 * Whether a route has a dynamic segment (`[param]`).
 */
function isDynamicRoute(route: string): boolean {
  return route.includes('[');
}

/**
 * Expands the routes on disk into the paths they actually serve.
 *
 * There are two kinds of dynamic route here and they need opposite treatment:
 *
 * - **Data-driven** — `/share/chat/[publicShareId]` has no fixed path at all;
 *   its URLs come from the chat-service indexable-share feed. Requiring a
 *   registry entry would mean inventing one for a path never requested. Those
 *   URLs still reach the sitemap via the dynamic half asserted in
 *   `sitemap.test.ts`.
 * - **Cluster** — `/learn/[topic]` is ONE file standing for eighteen reviewed
 *   pages that each have a registry entry (ADR-084). Exempting it would reopen
 *   this file's hole in both directions at once: a registry entry with no route
 *   would pass, and a route with no entry would too.
 *
 * So a cluster route is replaced by its real children, from the same order
 * array `generateStaticParams` reads.
 */
function expandRoutes(routes: string[]): string[] {
  return routes.flatMap((route) => {
    const expansion = SEO_CLUSTER_ROUTE_EXPANSIONS[route];
    if (expansion !== undefined) {
      return [...expansion];
    }
    return isDynamicRoute(route) ? [] : [route];
  });
}

describe('sitemap coverage', () => {
  const allRoutes = collectRoutePaths(MARKETING_ROOT, '');
  const routes = expandRoutes(allRoutes);
  const dynamicRoutes = allRoutes.filter(
    (route) => isDynamicRoute(route) && SEO_CLUSTER_ROUTE_EXPANSIONS[route] === undefined,
  );
  const clusterRoutes = allRoutes.filter(
    (route) => SEO_CLUSTER_ROUTE_EXPANSIONS[route] !== undefined,
  );
  const publishedPaths = new Set(getPublishedPages().map((page) => page.canonicalPath));
  const indexablePaths = new Set(getIndexablePages().map((page) => page.canonicalPath));

  it('finds the public marketing routes on disk', () => {
    expect(routes.length).toBeGreaterThan(1);
    expect(routes).toContain('/');
  });

  it('exempts only the data-driven dynamic routes', () => {
    // Pins the exemption to routes we know about. If a future dynamic marketing
    // route appears, this list changes and somebody has to decide deliberately
    // whether it is data-driven (exempt) or a cluster (expanded).
    expect(dynamicRoutes).toEqual([...DATA_DRIVEN_MARKETING_ROUTES]);
  });

  it('expands every cluster route into the pages it serves', () => {
    // A cluster route that stopped expanding would make both directions of the
    // checks below vacuously true for its children.
    for (const route of clusterRoutes) {
      const expansion = SEO_CLUSTER_ROUTE_EXPANSIONS[route] ?? [];
      expect(expansion.length).toBeGreaterThan(0);
      for (const path of expansion) {
        expect(routes).toContain(path);
      }
    }
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
