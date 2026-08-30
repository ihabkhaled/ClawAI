import { CODING_AGENT_INSTALL_PATH, CODING_AGENT_PATH } from '@/constants/coding-agent.constants';
import {
  INTEGRATIONS_HUB_PATH,
  INTEGRATIONS_HUB_SLUG,
  INTEGRATIONS_REVIEW_DATE,
  INTEGRATION_TOPIC_ORDER,
  getIntegrationPath,
  getIntegrationSlug,
} from '@/constants/integrations.constants';
import {
  LEARN_HUB_PATH,
  LEARN_HUB_SLUG,
  LEARN_REVIEW_DATE,
  LEARN_TOPIC_ORDER,
  getLearnTopicPath,
  getLearnTopicSlug,
} from '@/constants/learn.constants';
import {
  COMPARISON_HUB_PATH,
  COMPARISON_PATH_BY_RIVAL,
  COMPARISON_REVIEW_DATE,
  COMPARISON_RIVAL_ORDER,
  COMPARISON_SLUG_BY_RIVAL,
} from '@/constants/public-comparison.constants';
import { resolvePublicPageSeo } from '@/constants/public-page-seo-registry.constants';
import {
  AdEligibility,
  ContentCategory,
  ContentLifecycleStatus,
  ContentReviewStatus,
  FeedEligibility,
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
  /**
   * `LaunchPublicPageSlug` for the original 28 pages; a derived string for a
   * cluster child (`learn/what-is-rag`). `PublicContentDefinition.slug` has
   * always been `string`, and a cluster cannot enumerate its slugs in that enum
   * without hand-writing one member per page — the thing ADR-084 exists to
   * avoid.
   */
  slug: LaunchPublicPageSlug | string;
  path: string;
  category: ContentCategory;
  adEligibility: AdEligibility;
  /**
   * Whether the page belongs in the RSS feeds.
   *
   * Explicit on every entry, with no default, so a new page cannot join the
   * feeds by omission. Every indexable page used to be a feed item, which meant
   * subscribers were notified about the cookie policy.
   */
  feedEligibility: FeedEligibility;
  structuredDataType: StructuredDataType;
  relatedSlugs: readonly string[];
  /**
   * When this page's claims were last checked, if that is not the site-wide
   * review date. Comparison pages describe other vendors' products, which
   * change on their own schedule, so they carry their own date rather than
   * inheriting one that says nothing about them.
   */
  reviewDate?: string;
};

const PUBLISHED_CONTENT_CONFIGS: ReadonlyArray<PublishedContentConfig> = [
  {
    slug: LaunchPublicPageSlug.HOME,
    path: '/',
    category: ContentCategory.HOME,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEBSITE,
    relatedSlugs: ['about', 'features', 'pricing'],
  },
  {
    slug: LaunchPublicPageSlug.ABOUT,
    path: '/about',
    category: ContentCategory.ABOUT,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['architecture', 'features', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.ACCEPTABLE_USE,
    path: '/acceptable-use',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['terms', 'privacy', 'contact'],
  },
  {
    slug: LaunchPublicPageSlug.ARCHITECTURE,
    path: '/architecture',
    category: ContentCategory.ARCHITECTURE,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.TECH_ARTICLE,
    relatedSlugs: ['features', 'security-and-privacy', 'local-first-ai'],
  },
  {
    slug: LaunchPublicPageSlug.CONTACT,
    path: '/contact',
    category: ContentCategory.CONTACT,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['faq', 'local-first-ai', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.COOKIES,
    path: '/cookies',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['privacy', 'terms'],
  },
  {
    slug: LaunchPublicPageSlug.FAQ,
    path: '/faq',
    category: ContentCategory.FAQ,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.FAQ_PAGE,
    relatedSlugs: ['pricing', 'supported-models', 'contact'],
  },
  {
    slug: LaunchPublicPageSlug.FEATURES,
    path: '/features',
    category: ContentCategory.FEATURES,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.SOFTWARE_APPLICATION,
    relatedSlugs: ['how-it-works', 'supported-models', 'use-cases'],
  },
  {
    slug: LaunchPublicPageSlug.HOW_IT_WORKS,
    path: '/how-it-works',
    category: ContentCategory.HOW_IT_WORKS,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'pricing', 'architecture'],
  },
  {
    slug: LaunchPublicPageSlug.LOCAL_FIRST_AI,
    path: '/local-first-ai',
    category: ContentCategory.LOCAL_FIRST,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['contact', 'architecture', 'security-and-privacy'],
  },
  {
    slug: LaunchPublicPageSlug.PRICING,
    path: '/pricing',
    category: ContentCategory.PRICING,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'supported-models', 'faq'],
  },
  {
    slug: LaunchPublicPageSlug.PRIVACY,
    path: '/privacy',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['security-and-privacy', 'cookies', 'terms'],
  },
  {
    slug: LaunchPublicPageSlug.SECURITY_AND_PRIVACY,
    path: '/security-and-privacy',
    category: ContentCategory.SECURITY_PRIVACY,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['privacy', 'architecture', 'local-first-ai'],
  },
  {
    slug: LaunchPublicPageSlug.SUPPORTED_MODELS,
    path: '/supported-models',
    category: ContentCategory.PROVIDERS,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'pricing', 'how-it-works'],
  },
  {
    slug: LaunchPublicPageSlug.TERMS,
    path: '/terms',
    category: ContentCategory.LEGAL,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['acceptable-use', 'privacy', 'cookies'],
  },
  {
    slug: LaunchPublicPageSlug.USE_CASES,
    path: '/use-cases',
    category: ContentCategory.USE_CASES,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'how-it-works', 'pricing'],
  },
  // The VS Code extension. Ad-eligible: this is ClawAI's own product surface,
  // not a comparison of anyone else's, and it is the page most likely to be
  // found by somebody searching for an editor integration rather than for a
  // chat app.
  {
    slug: LaunchPublicPageSlug.CODING_AGENT,
    path: CODING_AGENT_PATH,
    category: ContentCategory.CODING_AGENT,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.SOFTWARE_APPLICATION,
    relatedSlugs: ['coding-agent/install', 'features', 'how-it-works'],
  },
  {
    slug: LaunchPublicPageSlug.CODING_AGENT_INSTALL,
    path: CODING_AGENT_INSTALL_PATH,
    category: ContentCategory.CODING_AGENT,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.FAQ_PAGE,
    relatedSlugs: ['coding-agent', 'features', 'pricing'],
  },
  // Comparison hub and its rival pages. Ad-ineligible on purpose: a page whose
  // job is to be a fair, checkable comparison of named competitors does not
  // also carry ad inventory.
  {
    slug: LaunchPublicPageSlug.COMPARE,
    path: COMPARISON_HUB_PATH,
    category: ContentCategory.COMPARISON,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'pricing', 'supported-models'],
    reviewDate: COMPARISON_REVIEW_DATE,
  },
  // The /learn cluster: one hub plus one page per topic, fanned from the order
  // array (ADR-084). Ad-ELIGIBLE — these explain techniques rather than ranking
  // named third-party products, so the reasoning that makes /compare/* ineligible
  // does not apply.
  {
    slug: LEARN_HUB_SLUG,
    path: LEARN_HUB_PATH,
    category: ContentCategory.GUIDE,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'how-it-works', 'supported-models'],
    reviewDate: LEARN_REVIEW_DATE,
  },
  ...LEARN_TOPIC_ORDER.map((topic): PublishedContentConfig => ({
    slug: getLearnTopicSlug(topic),
    path: getLearnTopicPath(topic),
    category: ContentCategory.GUIDE,
    adEligibility: AdEligibility.ELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.TECH_ARTICLE,
    relatedSlugs: [LEARN_HUB_SLUG, 'features', 'how-it-works'],
    reviewDate: LEARN_REVIEW_DATE,
  })),
  // The /integrations cluster: one hub plus one page per connector, fanned from
  // the order array (ADR-084). Ad-INELIGIBLE — the reasoning on /compare/*
  // applies verbatim: a page whose job is a checkable claim about a named
  // third-party connector does not also carry ad inventory.
  {
    slug: INTEGRATIONS_HUB_SLUG,
    path: INTEGRATIONS_HUB_PATH,
    category: ContentCategory.WORKSPACE,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.WEB_PAGE,
    relatedSlugs: ['features', 'use-cases', 'pricing'],
    reviewDate: INTEGRATIONS_REVIEW_DATE,
  },
  ...INTEGRATION_TOPIC_ORDER.map((topic): PublishedContentConfig => ({
    slug: getIntegrationSlug(topic),
    path: getIntegrationPath(topic),
    category: ContentCategory.WORKSPACE,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.FAQ_PAGE,
    relatedSlugs: [INTEGRATIONS_HUB_SLUG, 'features', 'use-cases'],
    reviewDate: INTEGRATIONS_REVIEW_DATE,
  })),
  ...COMPARISON_RIVAL_ORDER.map((rival): PublishedContentConfig => ({
    slug: COMPARISON_SLUG_BY_RIVAL[rival],
    path: COMPARISON_PATH_BY_RIVAL[rival],
    category: ContentCategory.COMPARISON,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.PUBLISHABLE,
    structuredDataType: StructuredDataType.FAQ_PAGE,
    relatedSlugs: ['compare', 'features', 'pricing'],
    reviewDate: COMPARISON_REVIEW_DATE,
  })),
];

// Retired: `guides`, `guides/getting-started`, `guides/provider-routing`,
// `guides/privacy-first-ai` (superseded by the shipped `/learn` GUIDE hub) and
// `workspace-connectors` (superseded by the shipped `/integrations` WORKSPACE
// hub) — see `docs/05-frontend/seo-content-architecture.md` F1/D4. A PLANNED
// slug describing a hub that now has a real, different URL scheme is a second,
// contradictory roadmap, not a placeholder worth keeping.
const PLANNED_CONTENT_CONFIGS = [
  ['multi-provider-ai', ContentCategory.MULTI_PROVIDER],
  ['model-routing', ContentCategory.MODEL_ROUTING],
  ['advanced-orchestration', ContentCategory.ORCHESTRATION],
  ['memory-and-context', ContentCategory.MEMORY_CONTEXT],
  ['rag-and-files', ContentCategory.RAG_FILES],
  ['desktop-agent', ContentCategory.DESKTOP_AGENT],
  ['self-hosting', ContentCategory.SELF_HOSTING],
  ['ai-safety', ContentCategory.AI_SAFETY],
  ['observability', ContentCategory.OBSERVABILITY],
  ['supported-providers', ContentCategory.PROVIDERS],
] as const;

function buildLocalizedMetadata(
  slug: string,
  reviewDate: string,
): Record<Locale, LocalizedContentMetadata> {
  return Object.values(Locale).reduce(
    (metadataByLocale, locale) => {
      // Resolved through the registry rather than indexed directly, so a
      // cluster can ship its SEO copy beside its body copy instead of growing
      // one exhaustive god-file past 10,000 lines. See
      // public-page-seo-registry.constants.ts.
      const seo = resolvePublicPageSeo(locale, slug);
      if (seo === undefined) {
        throw new Error(`No SEO copy registered for slug "${slug}" in locale "${locale}"`);
      }
      metadataByLocale[locale] = {
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        lastReviewed: reviewDate,
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
    feedEligibility: config.feedEligibility,
    structuredDataType: config.structuredDataType,
    relatedSlugs: config.relatedSlugs,
    locales: buildLocalizedMetadata(config.slug, config.reviewDate ?? REVIEW_DATE),
  }),
);

const PLANNED_DEFINITIONS: ReadonlyArray<PublicContentDefinition> = PLANNED_CONTENT_CONFIGS.map(
  ([slug, category]): PublicContentDefinition => ({
    slug,
    category,
    path: `/${slug}`,
    status: ContentLifecycleStatus.PLANNED,
    adEligibility: AdEligibility.INELIGIBLE,
    feedEligibility: FeedEligibility.NOT_PUBLISHABLE,
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
