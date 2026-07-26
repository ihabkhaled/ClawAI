import { describe, expect, it } from 'vitest';

import {
  CONTENT_REGISTRY,
  PUBLIC_CONTENT_DEFINITIONS,
} from '@/constants/content-registry.constants';
import { ContentLifecycleStatus, ContentReviewStatus, Indexability, AdEligibility } from '@/enums';
import { Locale } from '@/enums/locale.enum';
import {
  getAdEligiblePages,
  getIndexablePages,
  getIndexablePagesForLocale,
  getLanguageAlternates,
  getLocalizedCanonicalPath,
  getPageBySlug,
  getPageBySlugAndLocale,
  getPublishedPagesForLocale,
  getPublishedPages,
  isKnownPublicPath,
} from '@/utilities/content-registry.utility';

describe('content registry integrity', () => {
  it('stores each logical slug once with locale metadata nested below it', () => {
    expect(new Set(PUBLIC_CONTENT_DEFINITIONS.map((entry) => entry.slug)).size).toBe(
      PUBLIC_CONTENT_DEFINITIONS.length,
    );
    expect(PUBLIC_CONTENT_DEFINITIONS.find((entry) => entry.slug === 'features')?.locales).toEqual(
      expect.objectContaining({ [Locale.EN]: expect.any(Object) }),
    );
  });

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

  // Deliberately an explicit list rather than a derived one: this is the
  // tripwire that catches a page being flipped to PUBLISHED without anyone
  // reviewing it, since publishing also makes it indexable and linkable.
  it('publishes exactly the home, contact and six topic pages (all indexable)', () => {
    const published = getPublishedPages();
    const paths = [...new Set(published.map((page) => page.canonicalPath))].sort();
    expect(paths).toEqual([
      '/',
      '/architecture',
      '/contact',
      '/faq',
      '/features',
      '/how-it-works',
      '/local-first-ai',
      '/use-cases',
    ]);
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

  // Contact and the organisation-facing deployment page are sales/support
  // surfaces, so they are published and indexable but never ad surfaces.
  it('returns only reviewed, published editorial pages as ad surfaces', () => {
    const eligible = getAdEligiblePages();
    const paths = [...new Set(eligible.map((page) => page.canonicalPath))].sort();
    expect(paths).toEqual([
      '/',
      '/architecture',
      '/faq',
      '/features',
      '/how-it-works',
      '/use-cases',
    ]);
    for (const page of eligible) {
      expect(page.status).toBe(ContentLifecycleStatus.PUBLISHED);
      expect(page.reviewStatus).toBe(ContentReviewStatus.REVIEWED);
    }
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

describe('localized publication boundary', () => {
  it('publishes every reviewed public page under every locale URL', () => {
    const expectedCount = getIndexablePagesForLocale(Locale.EN).length;
    for (const locale of Object.values(Locale)) {
      expect(getIndexablePagesForLocale(locale)).toHaveLength(expectedCount);
    }
  });

  it('resolves metadata for every supported locale', () => {
    expect(getPublishedPagesForLocale(Locale.EN).length).toBe(8);
    expect(getPublishedPagesForLocale(Locale.JA).length).toBe(8);
    expect(getPageBySlugAndLocale('features', Locale.EN)?.title).toContain('Features');
    expect(getPageBySlugAndLocale('features', Locale.JA)?.title).toContain('Features');
  });

  it('creates localized canonicals and alternates for every language', () => {
    expect(getLocalizedCanonicalPath('features', Locale.EN)).toBe('/en/features');
    expect(getLocalizedCanonicalPath('features', Locale.JA)).toBe('/ja/features');
    expect(getLanguageAlternates('features')).toEqual(
      expect.objectContaining({
        en: '/en/features',
        ar: '/ar/features',
        ja: '/ja/features',
        zh: '/zh/features',
      }),
    );
  });
});
