/** The public landing page for Live Intelligence. `/live` itself is the signed-in portal screen. */
export const LIVE_INTELLIGENCE_MARKETING_PATH = '/features/live-intelligence';

/** The registry slug: the path without its leading slash. SEO copy lives in live-intelligence-seo.constants.ts. */
export const LIVE_INTELLIGENCE_SLUG = 'features/live-intelligence';

/** Where a signed-in user starts a live stream. */
export const LIVE_INTELLIGENCE_PORTAL_PATH = '/live';

/** Anchor ids for the in-page section nav. Stable by contract: they end up in deep links. */
export const LIVE_INTELLIGENCE_SECTION_IDS = {
  what: 'what-is-live-intelligence',
  steps: 'how-it-works',
  features: 'what-you-get',
  modes: 'analysis-modes',
  sources: 'sources-and-limits',
  plans: 'plans',
  faq: 'questions',
} as const;

/**
 * Free analysis minutes per month by plan (ADR-221, live-intelligence-spec.md). The figures live
 * here, not in thirteen translations, so they cannot drift. Plan names stay Latin brand names.
 * Seeded defaults, editable by an administrator: confirm against the admin page before launch.
 */
export const LIVE_INTELLIGENCE_FREE_MINUTES_BY_PLAN: ReadonlyArray<{
  plan: string;
  minutes: number;
}> = [
  { plan: 'Free', minutes: 30 },
  { plan: 'Starter', minutes: 120 },
  { plan: 'Plus', minutes: 300 },
  { plan: 'Pro', minutes: 600 },
];

/** The price of one analysis minute after the free minutes are used, in US dollars. */
export const LIVE_INTELLIGENCE_PAID_USD_PER_MINUTE = '0.02';
