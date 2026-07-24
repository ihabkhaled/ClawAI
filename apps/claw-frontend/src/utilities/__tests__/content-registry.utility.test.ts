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

  it('exactly one entry is PUBLISHED in Phase A: the homepage', () => {
    const published = getPublishedPages();
    expect(published).toHaveLength(1);
    expect(published[0]?.canonicalPath).toBe('/');
  });
});

describe('getIndexablePages / getAdEligiblePages defense in depth', () => {
  it('getIndexablePages only returns published pages from the real registry', () => {
    for (const page of getIndexablePages()) {
      expect(page.status).toBe(ContentLifecycleStatus.PUBLISHED);
    }
  });

  it('getAdEligiblePages returns none in Phase A (home is ad-ineligible)', () => {
    expect(getAdEligiblePages()).toHaveLength(0);
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
