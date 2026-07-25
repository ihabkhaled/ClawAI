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
// Phase B ships eight PUBLISHED entries: home, contact, and the six topic
// pages (features, how-it-works, architecture, local-first-ai, use-cases,
// faq). Everything else stays PLANNED so a later phase only needs to flip
// `status` and add the page component.
//
// A slug appears EXACTLY ONCE. getPageBySlug() returns the first match, so a
// duplicate between the published block and the planned list would silently
// shadow one of them.
//
// Note on `local-first-ai`: the route name is retained for link stability, but
// the page is positioned as private on-premise deployment for ORGANISATIONS,
// not as the product's identity. Planned routes that would have marketed local
// models to individual users were removed when the product was repositioned
// around hosted access to frontier cloud models.
export const CONTENT_REGISTRY: ReadonlyArray<ContentRegistryEntry> = [
  {
    slug: 'home',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'ClawAI — Every Frontier AI Model, One Subscription',
    description:
      'Reach Claude Opus, GPT-5, Gemini, Kimi K2, GLM, Qwen, DeepSeek and Grok from one account. Intelligent routing picks the right model per task, with plans from $5/month.',
    category: ContentCategory.HOME,
    canonicalPath: '/',
    lastReviewed: '2026-07-25',
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
  {
    slug: 'contact',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'Contact ClawAI',
    description:
      'Get in touch with the ClawAI team — questions about self-hosting, local-first AI orchestration, workspace integrations, or the desktop agent.',
    category: ContentCategory.CONTACT,
    canonicalPath: '/contact',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    // A form/support page is indexable but never an ad surface.
    adEligibility: AdEligibility.INELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['about', 'faq'],
    structuredDataType: StructuredDataType.NONE,
  },
  // ─── Phase B: the six topic pages, each now a real reviewed page ──────────
  // The home page is a summary and entry point; long-form content lives on
  // these routes so each one can rank and be linked on its own.
  {
    slug: 'features',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'Features — ClawAI',
    description:
      'One subscription across Claude, GPT, Gemini, Kimi, GLM, Qwen, DeepSeek and Grok, with intelligent routing, Compare, Consensus, Judge review, memory, files and workspace connectors.',
    category: ContentCategory.FEATURES,
    canonicalPath: '/features',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['how-it-works', 'use-cases', 'architecture'],
    structuredDataType: StructuredDataType.NONE,
  },
  {
    slug: 'how-it-works',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'How It Works — ClawAI',
    description:
      'Create an account, pick a plan, and ask anything. ClawAI routes each task to the best-suited model and meters every request against one cost-normalized allowance.',
    category: ContentCategory.HOW_IT_WORKS,
    canonicalPath: '/how-it-works',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['features', 'faq', 'use-cases'],
    structuredDataType: StructuredDataType.NONE,
  },
  {
    slug: 'architecture',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'Architecture — ClawAI',
    description:
      'How ClawAI is built: 18 independently deployable services, database-per-service ownership, an event-driven backbone, streaming responses, and defence-in-depth security.',
    category: ContentCategory.ARCHITECTURE,
    canonicalPath: '/architecture',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['features', 'local-first-ai'],
    structuredDataType: StructuredDataType.NONE,
  },
  {
    slug: 'local-first-ai',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'ClawAI on Your Infrastructure — Private Deployment for Organisations',
    description:
      'For organisations whose data cannot leave their network: deploy ClawAI on your own servers and run local models only. Scoped per engagement — talk to us.',
    category: ContentCategory.LOCAL_FIRST,
    canonicalPath: '/local-first-ai',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    // A sales/contact page, never an ad surface.
    adEligibility: AdEligibility.INELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['contact', 'architecture'],
    structuredDataType: StructuredDataType.NONE,
  },
  {
    slug: 'use-cases',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'Use Cases — ClawAI',
    description:
      'What people build with ClawAI: development, research, analysis, writing, support, document generation and images — each routed to the model best suited to it.',
    category: ContentCategory.USE_CASES,
    canonicalPath: '/use-cases',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['features', 'how-it-works'],
    structuredDataType: StructuredDataType.NONE,
  },
  {
    slug: 'faq',
    locale: Locale.EN,
    status: ContentLifecycleStatus.PUBLISHED,
    title: 'FAQ — ClawAI',
    description:
      'Answers on plans and billing, which models are included, how allowances are measured, data privacy, and private deployment for organisations.',
    category: ContentCategory.FAQ,
    canonicalPath: '/faq',
    lastReviewed: '2026-07-25',
    indexability: Indexability.INDEXABLE,
    adEligibility: AdEligibility.ELIGIBLE,
    reviewStatus: ContentReviewStatus.REVIEWED,
    relatedSlugs: ['how-it-works', 'contact'],
    structuredDataType: StructuredDataType.NONE,
  },
  ...(
    [
      ['about', ContentCategory.ABOUT],
      ['multi-provider-ai', ContentCategory.MULTI_PROVIDER],
      ['model-routing', ContentCategory.MODEL_ROUTING],
      ['advanced-orchestration', ContentCategory.ORCHESTRATION],
      ['memory-and-context', ContentCategory.MEMORY_CONTEXT],
      ['rag-and-files', ContentCategory.RAG_FILES],
      ['workspace-connectors', ContentCategory.WORKSPACE],
      ['desktop-agent', ContentCategory.DESKTOP_AGENT],
      ['self-hosting', ContentCategory.SELF_HOSTING],
      ['security-and-privacy', ContentCategory.SECURITY_PRIVACY],
      ['ai-safety', ContentCategory.AI_SAFETY],
      ['observability', ContentCategory.OBSERVABILITY],
      ['supported-providers', ContentCategory.PROVIDERS],
      ['guides', ContentCategory.GUIDE],
      ['guides/getting-started', ContentCategory.GUIDE],
      ['guides/provider-routing', ContentCategory.GUIDE],
      ['guides/privacy-first-ai', ContentCategory.GUIDE],
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
