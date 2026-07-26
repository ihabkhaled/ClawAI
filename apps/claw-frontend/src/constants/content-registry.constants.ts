import { PUBLIC_PAGE_SEO_BY_LOCALE } from '@/constants/public-page-seo.constants';
import {
  AdEligibility,
  ContentCategory,
  ContentLifecycleStatus,
  ContentReviewStatus,
  Indexability,
  StructuredDataType,
} from '@/enums';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { Locale } from '@/enums/locale.enum';
import type {
  ContentRegistryEntry,
  LocalizedContentMetadata,
  PublicContentDefinition,
} from '@/types/content-registry.types';

const REVIEW_DATE = '2026-07-27';

type PublishedContentConfig = {
  slug: LaunchPublicPageSlug;
  path: string;
  category: ContentCategory;
  adEligibility: AdEligibility;
  structuredDataType: StructuredDataType;
  relatedSlugs: readonly string[];
};

const PUBLISHED_CONTENT_CONFIGS: ReadonlyArray<PublishedContentConfig> = [
  {
    slug: LaunchPublicPageSlug.HOME,
    path: '/',
    category: ContentCategory.HOME,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.WEBSITE,
    relatedSlugs: ['about', 'features', 'pricing'],
  },
  {
    slug: LaunchPublicPageSlug.ABOUT,
    path: '/about',
    category: ContentCategory.ABOUT,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['architecture', 'features', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.ACCEPTABLE_USE,
    path: '/acceptable-use',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['terms', 'privacy', 'contact'],
  },
  {
    slug: LaunchPublicPageSlug.ARCHITECTURE,
    path: '/architecture',
    category: ContentCategory.ARCHITECTURE,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.TECH_ARTICLE,
    relatedSlugs: ['features', 'security-and-privacy', 'local-first-ai'],
  },
  {
    slug: LaunchPublicPageSlug.CONTACT,
    path: '/contact',
    category: ContentCategory.CONTACT,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['faq', 'local-first-ai', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.COOKIES,
    path: '/cookies',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['privacy', 'terms'],
  },
  {
    slug: LaunchPublicPageSlug.FAQ,
    path: '/faq',
    category: ContentCategory.FAQ,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.FAQ_PAGE,
    relatedSlugs: ['pricing', 'supported-models', 'contact'],
  },
  {
    slug: LaunchPublicPageSlug.FEATURES,
    path: '/features',
    category: ContentCategory.FEATURES,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.SOFTWARE_APPLICATION,
    relatedSlugs: ['how-it-works', 'supported-models', 'use-cases'],
  },
  {
    slug: LaunchPublicPageSlug.HOW_IT_WORKS,
    path: '/how-it-works',
    category: ContentCategory.HOW_IT_WORKS,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'pricing', 'architecture'],
  },
  {
    slug: LaunchPublicPageSlug.LOCAL_FIRST_AI,
    path: '/local-first-ai',
    category: ContentCategory.LOCAL_FIRST,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['contact', 'architecture', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.PRICING,
    path: '/pricing',
    category: ContentCategory.PRICING,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'supported-models', 'faq'],
  },
  {
    slug: LaunchPublicPageSlug.PRIVACY,
    path: '/privacy',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['security-and-privacy', 'cookies', 'terms'],
  },
  {
    slug: LaunchPublicPageSlug.SECURITY_AND_PRIVACY,
    path: '/security-and-privacy',
    category: ContentCategory.SECURITY_PRIVACY,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['privacy', 'architecture', 'local-first-ai'],
  },
  {
    slug: LaunchPublicPageSlug.SUPPORTED_MODELS,
    path: '/supported-models',
    category: ContentCategory.PROVIDERS,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'pricing', 'how-it-works'],
  },
  {
    slug: LaunchPublicPageSlug.TERMS,
    path: '/terms',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['acceptable-use', 'privacy', 'cookies'],
  },
  {
    slug: LaunchPublicPageSlug.USE_CASES,
    path: '/use-cases',
    category: ContentCategory.USE_CASES,
    adEligibility: AdEligibility.ELIGIBLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'how-it-works', 'pricing'],
  },
];

const PLANNED_CONTENT_CONFIGS = [
  ['multi-provider-ai', ContentCategory.MULTI_PROVIDER],
  ['model-routing', ContentCategory.MODEL_ROUTING],
  ['advanced-orchestration', ContentCategory.ORCHESTRATION],
  ['memory-and-context', ContentCategory.MEMORY_CONTEXT],
  ['rag-and-files', ContentCategory.RAG_FILES],
  ['workspace-connectors', ContentCategory.WORKSPACE],
  ['desktop-agent', ContentCategory.DESKTOP_AGENT],
  ['self-hosting', ContentCategory.SELF_HOSTING],
  ['ai-safety', ContentCategory.AI_SAFETY],
  ['observability', ContentCategory.OBSERVABILITY],
  ['supported-providers', ContentCategory.PROVIDERS],
  ['guides', ContentCategory.GUIDE],
  ['guides/getting-started', ContentCategory.GUIDE],
  ['guides/provider-routing', ContentCategory.GUIDE],
  ['guides/privacy-first-ai', ContentCategory.GUIDE],
] as const;

function buildLocalizedMetadata(
  slug: LaunchPublicPageSlug,
): Record<Locale, LocalizedContentMetadata> {
  return Object.values(Locale).reduce(
    (metadataByLocale, locale) => {
      const seo = PUBLIC_PAGE_SEO_BY_LOCALE[locale][slug];
      metadataByLocale[locale] = {
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        lastReviewed: REVIEW_DATE,
        reviewStatus: ContentReviewStatus.REVIEWED,
        indexability: Indexability.INDEXABLE,
      };
      return metadataByLocale;
    },
    {} as Record<Locale, LocalizedContentMetadata>,
  );
}

const PUBLISHED_DEFINITIONS: ReadonlyArray<PublicContentDefinition> = PUBLISHED_CONTENT_CONFIGS.map(
  (config): PublicContentDefinition => ({
    slug: config.slug,
    category: config.category,
    path: config.path,
    status: ContentLifecycleStatus.PUBLISHED,
    adEligibility: config.adEligibility,
    structuredDataType: config.structuredDataType,
    relatedSlugs: config.relatedSlugs,
    locales: buildLocalizedMetadata(config.slug),
  }),
);

const PLANNED_DEFINITIONS: ReadonlyArray<PublicContentDefinition> = PLANNED_CONTENT_CONFIGS.map(
  ([slug, category]): PublicContentDefinition => ({
    slug,
    category,
    path: `/${slug}`,
    status: ContentLifecycleStatus.PLANNED,
    adEligibility: AdEligibility.INELIGIBLE,
    structuredDataType: StructuredDataType.NONE,
    relatedSlugs: [],
    locales: {},
  }),
);

/**
 * Canonical public-discovery authority. Navigation, metadata, sitemaps, RSS,
 * robots decisions and audits derive from this logical, locale-aware registry.
 */
export const PUBLIC_CONTENT_DEFINITIONS: ReadonlyArray<PublicContentDefinition> = [
  ...PUBLISHED_DEFINITIONS,
  ...PLANNED_DEFINITIONS,
];

/**
 * Compatibility projection for older consumers. New code should prefer
 * `PUBLIC_CONTENT_DEFINITIONS` and the locale-aware registry utilities.
 */
export const CONTENT_REGISTRY: ReadonlyArray<ContentRegistryEntry> =
  PUBLIC_CONTENT_DEFINITIONS.flatMap((definition) => {
    const localizedEntries = Object.entries(definition.locales).map(
      ([locale, metadata]): ContentRegistryEntry => ({
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
      }),
    );

    if (localizedEntries.length > 0) {
      return localizedEntries;
    }

    return [
      {
        slug: definition.slug,
        locale: Locale.EN,
        status: definition.status,
        title: '',
        description: '',
        keywords: [],
        category: definition.category,
        canonicalPath: definition.path,
        lastReviewed: '',
        indexability: Indexability.NOINDEX,
        adEligibility: AdEligibility.INELIGIBLE,
        reviewStatus: ContentReviewStatus.PENDING_REVIEW,
        relatedSlugs: definition.relatedSlugs,
        structuredDataType: definition.structuredDataType,
      },
    ];
  });
