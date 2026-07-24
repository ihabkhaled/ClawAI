import { describe, expect, it } from 'vitest';

import { CONTENT_REGISTRY } from '@/constants/content-registry.constants';
import { ContentLifecycleStatus, Indexability, AdEligibility } from '@/enums';
import {
  getAdEligiblePages,
  getIndexablePages,
  getPageBySlug,
  getPublishedPages,
  isKnownPublicPath,
} from '@/utilities/content-registry.utility';

describe('content registry integrity', () => {
  it('has no duplicate (slug, locale) pairs', () => {
    const seen = new Set<string>();
    for (const entry of CONTENT_REGISTRY) {
      const key = `${entry.slug}:${entry.locale}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('every canonicalPath is an absolute path', () => {
    for (const entry of CONTENT_REGISTRY) {
      expect(entry.canonicalPath.startsWith('/')).toBe(true);
    }
  });

  it('every PLANNED entry is declared non-indexable and ad-ineligible', () => {
    const planned = CONTENT_REGISTRY.filter(
      (entry) => entry.status === ContentLifecycleStatus.PLANNED,
    );
    expect(planned.length).toBeGreaterThan(0);
    for (const entry of planned) {
      expect(entry.indexability).toBe(Indexability.NOINDEX);
      expect(entry.adEligibility).toBe(AdEligibility.INELIGIBLE);
    }
  });

  it('publishes the homepage and the contact page (both indexable)', () => {
    const published = getPublishedPages();
    const paths = published.map((page) => page.canonicalPath).sort();
    expect(paths).toEqual(['/', '/contact']);
    for (const page of published) {
      expect(page.indexability).toBe(Indexability.INDEXABLE);
    }
  });
});

describe('getIndexablePages / getAdEligiblePages defense in depth', () => {
  it('getIndexablePages only returns published pages from the real registry', () => {
    for (const page of getIndexablePages()) {
      expect(page.status).toBe(ContentLifecycleStatus.PUBLISHED);
    }
  });

  it('getAdEligiblePages returns only the reviewed, published homepage', () => {
    const eligible = getAdEligiblePages();
    expect(eligible).toHaveLength(1);
    expect(eligible[0]?.canonicalPath).toBe('/');
    expect(eligible[0]?.status).toBe(ContentLifecycleStatus.PUBLISHED);
  });
});

describe('getPageBySlug / isKnownPublicPath', () => {
  it('finds the home entry by slug', () => {
    expect(getPageBySlug('home')?.canonicalPath).toBe('/');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getPageBySlug('does-not-exist')).toBeUndefined();
  });

  it('treats the homepage as a known public path', () => {
    expect(isKnownPublicPath('/')).toBe(true);
  });

  it('treats a planned page path as NOT a known public path', () => {
    expect(isKnownPublicPath('/about')).toBe(false);
  });

  it('treats an unregistered path as NOT a known public path', () => {
    expect(isKnownPublicPath('/chat')).toBe(false);
    expect(isKnownPublicPath('/some/random/path')).toBe(false);
  });
});
