import { describe, expect, it } from 'vitest';

import {
  CONTENT_REGISTRY,
  PUBLIC_CONTENT_DEFINITIONS,
} from '@/constants/content-registry.constants';
import { INTEGRATION_TOPIC_ORDER, getIntegrationPath } from '@/constants/integrations.constants';
import { LEARN_TOPIC_ORDER, getLearnTopicPath } from '@/constants/learn.constants';
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
  it('publishes exactly the reviewed launch surface (all indexable)', () => {
    const published = getPublishedPages();
    const paths = [...new Set(published.map((page) => page.canonicalPath))].sort();
    // Hand-authored pages are listed one by one on purpose: that is what makes
    // this a review tripwire. Cluster children are derived from the cluster's
    // own order array, because there the contract genuinely is "all of them" —
    // listing eighteen generated paths would not be a review, and would make
    // every content batch conflict in this file.
    const expected = [
      ...LEARN_TOPIC_ORDER.map(getLearnTopicPath),
      ...INTEGRATION_TOPIC_ORDER.map(getIntegrationPath),
      '/',
      '/about',
      '/acceptable-use',
      '/architecture',
      '/coding-agent',
      '/coding-agent/install',
      '/compare',
      '/compare/chatgpt',
      '/compare/claude',
      '/compare/copilot',
      '/compare/deepseek',
      '/compare/gemini',
      '/compare/glm',
      '/compare/kimi',
      '/compare/perplexity',
      '/compare/qwen',
      '/contact',
      '/cookies',
      '/faq',
      '/features',
      '/how-it-works',
      '/integrations',
      '/learn',
      '/local-first-ai',
      '/pricing',
      '/privacy',
      '/security-and-privacy',
      '/supported-models',
      '/terms',
      '/use-cases',
    ].sort();
    expect(paths).toEqual(expected);
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
    // The two Coding Agent pages are ad-eligible because they are ClawAI's own
    // product surface. The comparison pages are not: a page whose job is a fair
    // comparison of named competitors does not also carry ad inventory.
    expect(paths).toEqual(
      [
        ...LEARN_TOPIC_ORDER.map(getLearnTopicPath),
        '/',
        '/architecture',
        '/coding-agent',
        '/coding-agent/install',
        '/faq',
        '/features',
        '/how-it-works',
        '/learn',
        '/use-cases',
      ].sort(),
    );
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
    expect(isKnownPublicPath('/multi-provider-ai')).toBe(false);
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
    // 28 launch pages + the /learn hub + one page per learn topic + the
    // /integrations hub + one page per connector.
    const expectedCount = 29 + LEARN_TOPIC_ORDER.length + 1 + INTEGRATION_TOPIC_ORDER.length;
    expect(getPublishedPagesForLocale(Locale.EN).length).toBe(expectedCount);
    expect(getPublishedPagesForLocale(Locale.JA).length).toBe(expectedCount);
    expect(getPageBySlugAndLocale('features', Locale.EN)?.title.toLowerCase()).toContain(
      'features',
    );
    expect(getPageBySlugAndLocale('features', Locale.JA)?.title).toMatch(
      /[\u3040-\u30ff\u3400-\u9fff]/,
    );
  });

  it('publishes native SEO metadata and focused keywords for every locale', () => {
    const englishPages = new Map(
      getPublishedPagesForLocale(Locale.EN).map((page) => [page.slug, page]),
    );

    for (const locale of Object.values(Locale)) {
      for (const page of getPublishedPagesForLocale(locale)) {
        expect(page.title.trim().length).toBeGreaterThan(0);
        expect(page.description.trim().length).toBeGreaterThan(80);
        expect(page.keywords.length).toBeGreaterThanOrEqual(3);
        expect(page.title.match(/ClawAI.*ClawAI/)).toBeNull();

        if (locale !== Locale.EN) {
          // The tripwire for a locale that silently fell back to English. It
          // applies to titles too, which is why "ClawAI vs ChatGPT" carries a
          // localized qualifier in the Romance locales rather than being copied
          // across verbatim — a title identical to the English one is
          // indistinguishable from a missing translation.
          const englishPage = englishPages.get(page.slug);
          expect(page.title).not.toBe(englishPage?.title);
          expect(page.description).not.toBe(englishPage?.description);
        }
      }
    }
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
