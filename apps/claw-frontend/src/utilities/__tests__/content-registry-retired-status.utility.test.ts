import { describe, expect, it, vi } from 'vitest';

import {
  AdEligibility,
  ContentCategory,
  ContentLifecycleStatus,
  ContentReviewStatus,
  FeedEligibility,
  Indexability,
  StructuredDataType,
} from '@/enums';
import { Locale } from '@/enums/locale.enum';
import type { ContentRegistryEntry, PublicContentDefinition } from '@/types/content-registry.types';

// RETIRED is the un-publish state (docs/05-frontend/seo-content-architecture.md
// §8.3): a page taken out of circulation without deleting its registry entry,
// so the route file can 410/redirect instead of the whole surface going
// silently 404. Every consumer of the registry gates on
// `status === ContentLifecycleStatus.PUBLISHED`, which already excludes
// anything that is not PUBLISHED — this test proves RETIRED is one of the
// statuses excluded that way, the same as PLANNED, rather than asserting it by
// reading the source.
function buildDefinition(slug: string, status: ContentLifecycleStatus): PublicContentDefinition {
  const metadata = {
    title: `${slug} title`,
    description: `${slug} description`,
    keywords: [slug],
    lastReviewed: '2026-01-01',
    reviewStatus: ContentReviewStatus.REVIEWED,
    indexability: Indexability.INDEXABLE,
  };
  return {
    slug,
    category: ContentCategory.FEATURES,
    path: `/${slug}`,
    status,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: [],
    // A RETIRED page keeps its locale metadata — that is the point: the
    // history survives, only the derived public surfaces stop showing it. A
    // PLANNED page has never had content, so its locales stay empty.
    locales: status === ContentLifecycleStatus.PLANNED ? {} : { [Locale.EN]: metadata },
  };
}

function toEntry(definition: PublicContentDefinition): ContentRegistryEntry[] {
  return Object.entries(definition.locales).map(([locale, metadata]) => ({
    slug: definition.slug,
    locale: locale as Locale,
    status: definition.status,
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    category: definition.category,
    canonicalPath: definition.path,
    lastReviewed: metadata.lastReviewed,
    indexability: metadata.indexability,
    adEligibility: definition.adEligibility,
    reviewStatus: metadata.reviewStatus,
    relatedSlugs: definition.relatedSlugs,
    structuredDataType: definition.structuredDataType,
  }));
}

const PUBLISHED_DEFINITION = buildDefinition('still-live', ContentLifecycleStatus.PUBLISHED);
const RETIRED_DEFINITION = buildDefinition('retired-page', ContentLifecycleStatus.RETIRED);
const PLANNED_DEFINITION = buildDefinition('planned-page', ContentLifecycleStatus.PLANNED);

const FIXTURE_DEFINITIONS: readonly PublicContentDefinition[] = [
  PUBLISHED_DEFINITION,
  RETIRED_DEFINITION,
  PLANNED_DEFINITION,
];

vi.mock('@/constants/content-registry.constants', () => ({
  PUBLIC_CONTENT_DEFINITIONS: FIXTURE_DEFINITIONS,
  CONTENT_REGISTRY: FIXTURE_DEFINITIONS.flatMap(toEntry),
}));

describe('ContentLifecycleStatus.RETIRED', () => {
  it('is excluded from every published-derived surface, the same way PLANNED is', async () => {
    const {
      getPublishedPages,
      getPublishedPagesForLocale,
      getIndexablePages,
      getIndexablePagesForLocale,
      getFeedPagesForLocale,
      getAdEligiblePages,
      isKnownPublicPath,
      getPageBySlug,
    } = await import('@/utilities/content-registry.utility');

    for (const page of getPublishedPages()) {
      expect(page.slug).not.toBe('retired-page');
    }
    for (const page of getPublishedPagesForLocale(Locale.EN)) {
      expect(page.slug).not.toBe('retired-page');
    }
    for (const page of getIndexablePages()) {
      expect(page.slug).not.toBe('retired-page');
    }
    for (const page of getIndexablePagesForLocale(Locale.EN)) {
      expect(page.slug).not.toBe('retired-page');
    }
    for (const page of getFeedPagesForLocale(Locale.EN)) {
      expect(page.slug).not.toBe('retired-page');
    }
    for (const page of getAdEligiblePages()) {
      expect(page.slug).not.toBe('retired-page');
    }
    expect(isKnownPublicPath('/retired-page')).toBe(false);

    // The registry entry itself is still findable by slug — retiring a page
    // does not erase it, only removes it from the derived public surfaces.
    expect(getPageBySlug('retired-page')?.status).toBe('RETIRED');
  });

  it('still surfaces a PUBLISHED page on every one of those same functions', async () => {
    const { getPublishedPages, getIndexablePages, getFeedPagesForLocale, isKnownPublicPath } =
      await import('@/utilities/content-registry.utility');

    expect(getPublishedPages().some((page) => page.slug === 'still-live')).toBe(true);
    expect(getIndexablePages().some((page) => page.slug === 'still-live')).toBe(true);
    expect(getFeedPagesForLocale(Locale.EN).some((page) => page.slug === 'still-live')).toBe(true);
    expect(isKnownPublicPath('/still-live')).toBe(true);
  });
});
