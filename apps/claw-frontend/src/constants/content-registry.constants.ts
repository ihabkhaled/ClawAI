import {
  AdEligibility,
  ContentCategory,
  ContentLifecycleStatus,
  ContentReviewStatus,
  Indexability,
  StructuredDataType,
} from '@/enums';
import { Locale } from '@/enums/locale.enum';
import type { ContentRegistryEntry } from '@/types/content-registry.types';

// Canonical source of truth for every public marketing/editorial page —
// nav, sitemap.ts, robots middleware, and (later) the AdSense eligibility
// resolver all derive from this single array. A page that is not PUBLISHED
// here is never linked, never in the sitemap, and never indexable —
// regardless of what individual fields on its entry say (see
// getIndexablePages()/isKnownPublicPath() in content-registry.utility.ts
// for the defense-in-depth enforcement of that rule).
//
// Phase A ships exactly one PUBLISHED entry (home, en). Every other page
// from the public-content inventory is registered PLANNED so later phases
// only need to flip `status` and add the page component — the registry
// shape, nav wiring, and crawler plumbing are already correct.
export const CONTENT_REGISTRY: ReadonlyArray<ContentRegistryEntry> = [
  {
    slug: 'home',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'ClawAI — Local-First AI Orchestration Platform',
    description:
      'ClawAI orchestrates local and cloud AI models with intelligent routing, memory, workspace integrations, and a desktop agent — self-hosted, privacy-first, and open on GitHub.',
    category: ContentCategory.HOME,
    canonicalPath: '/',
    lastReviewed: '2026-07-24',
    indexability: Indexability.INDEXABLE,
    // The homepage is the one reviewed editorial page live in Phase A, so it
    // is the only ad-eligible route. Whether ads actually serve is still
    // gated by NEXT_PUBLIC_ADSENSE_SERVING_ENABLED (off by default) — this
    // flag only makes the page a valid ad surface, not an active one.
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['about', 'how-it-works', 'architecture'],
    structuredDataType: StructuredDataType.WEBSITE,
  },
  ...(
    [
      ['about', ContentCategory.ABOUT],
      ['how-it-works', ContentCategory.HOW_IT_WORKS],
      ['features', ContentCategory.FEATURES],
      ['architecture', ContentCategory.ARCHITECTURE],
      ['local-first-ai', ContentCategory.LOCAL_FIRST],
      ['multi-provider-ai', ContentCategory.MULTI_PROVIDER],
      ['model-routing', ContentCategory.MODEL_ROUTING],
      ['advanced-orchestration', ContentCategory.ORCHESTRATION],
      ['local-models', ContentCategory.LOCAL_FIRST],
      ['memory-and-context', ContentCategory.MEMORY_CONTEXT],
      ['rag-and-files', ContentCategory.RAG_FILES],
      ['workspace-connectors', ContentCategory.WORKSPACE],
      ['desktop-agent', ContentCategory.DESKTOP_AGENT],
      ['self-hosting', ContentCategory.SELF_HOSTING],
      ['security-and-privacy', ContentCategory.SECURITY_PRIVACY],
      ['ai-safety', ContentCategory.AI_SAFETY],
      ['observability', ContentCategory.OBSERVABILITY],
      ['supported-providers', ContentCategory.PROVIDERS],
      ['use-cases', ContentCategory.USE_CASES],
      ['guides', ContentCategory.GUIDE],
      ['guides/getting-started', ContentCategory.GUIDE],
      ['guides/running-local-models', ContentCategory.GUIDE],
      ['guides/provider-routing', ContentCategory.GUIDE],
      ['guides/privacy-first-ai', ContentCategory.GUIDE],
      ['compare/local-ai-vs-cloud-ai', ContentCategory.COMPARISON],
      ['faq', ContentCategory.FAQ],
      ['contact', ContentCategory.CONTACT],
      ['privacy', ContentCategory.LEGAL],
      ['terms', ContentCategory.LEGAL],
      ['cookies', ContentCategory.LEGAL],
      ['acceptable-use', ContentCategory.LEGAL],
    ] as const
  ).map(([slug, category]): ContentRegistryEntry => ({
    slug,
    locale: Locale.EN,
    status: ContentLifecycleStatus.PLANNED,
    title: '',
    description: '',
    category,
    canonicalPath: `/${slug}`,
    lastReviewed: '2026-07-24',
    indexability: Indexability.NOINDEX,
    adEligibility: AdEligibility.INELIGIBLE,
    reviewStatus: ContentReviewStatus.PENDING_REVIEW,
    relatedSlugs: [],
    structuredDataType: StructuredDataType.NONE,
  })),
];
