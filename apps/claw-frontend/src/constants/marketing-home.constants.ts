import type { HomeValueBand } from '@/types/marketing.types';
import type { MarketingPageSection } from '@/types/subscription-marketing.types';

// The home page is deliberately an ENTRY POINT, not an encyclopedia: every
// topic gets one short band plus a link to the dedicated page that covers it
// in depth. These are the canonical paths those bands link out to — they
// mirror the `canonicalPath` values registered in CONTENT_REGISTRY.
export const MARKETING_HOME_PATHS = {
  FEATURES: '/features',
  HOW_IT_WORKS: '/how-it-works',
  ARCHITECTURE: '/architecture',
  LOCAL_FIRST_AI: '/local-first-ai',
  USE_CASES: '/use-cases',
  FAQ: '/faq',
  CONTACT: '/contact',
  PRICING: '/pricing',
  PAY_AS_YOU_GO: '/features/pay-as-you-go-credit',
  ADMINISTRATION: '/features/administration-and-access-control',
} as const;

// Plan slugs kept when the pricing block is asked for a `compact` render
// (an embed that only needs the headline tiers). The home page renders the
// full ladder, so it does not pass `compact`.
export const MARKETING_COMPACT_PLAN_SLUGS: ReadonlyArray<string> = ['free', 'pro', 'unlimited'];

// Proof points shown in the organisations band. This is the ONE place on the
// home page where on-premise/self-managed deployment is offered, and it is
// scoped to companies — it is a contact-sales conversation, never a
// self-serve individual plan.
/**
 * The three things worth saying about the editor extension on the homepage.
 *
 * Deliberately not a feature list — the overview page has that. These answer
 * the three objections a developer raises in the first ten seconds: do I need
 * another subscription, does my code leave the machine, and does it work with
 * what I already run.
 */
export const MARKETING_CODING_AGENT_POINTS: ReadonlyArray<MarketingPageSection> = [
  {
    titleKey: 'marketing.home.codingAgent.point1Title',
    bodyKey: 'marketing.home.codingAgent.point1Body',
  },
  {
    titleKey: 'marketing.home.codingAgent.point2Title',
    bodyKey: 'marketing.home.codingAgent.point2Body',
  },
  {
    titleKey: 'marketing.home.codingAgent.point3Title',
    bodyKey: 'marketing.home.codingAgent.point3Body',
  },
];

export const MARKETING_ENTERPRISE_POINTS: ReadonlyArray<MarketingPageSection> = [
  {
    titleKey: 'marketing.home.enterprise.point1Title',
    bodyKey: 'marketing.home.enterprise.point1Body',
  },
  {
    titleKey: 'marketing.home.enterprise.point2Title',
    bodyKey: 'marketing.home.enterprise.point2Body',
  },
  {
    titleKey: 'marketing.home.enterprise.point3Title',
    bodyKey: 'marketing.home.enterprise.point3Body',
  },
];

/**
 * How many model names each provider card shows on the home page.
 *
 * OpenAI alone exposes 86 here. A card listing them all would push the rest of
 * the page below three screens of near-identical snapshot ids; the count beside
 * the chips is what carries the "there are a lot" message.
 */
export const MODEL_ROSTER_CHIP_LIMIT = 6;

/**
 * The pay-as-you-go band: the wallet, not a price. Plan prices and top-up
 * packages come from versioned price rows, so this band states no amount.
 */
export const MARKETING_HOME_PAYG_BAND: HomeValueBand = {
  id: 'pay-as-you-go',
  eyebrowKey: 'marketing.home.payg.eyebrow',
  titleKey: 'marketing.home.payg.title',
  bodyKey: 'marketing.home.payg.body',
  points: [
    { titleKey: 'marketing.home.payg.point1Title', bodyKey: 'marketing.home.payg.point1Body' },
    { titleKey: 'marketing.home.payg.point2Title', bodyKey: 'marketing.home.payg.point2Body' },
    { titleKey: 'marketing.home.payg.point3Title', bodyKey: 'marketing.home.payg.point3Body' },
  ],
  primaryLink: {
    labelKey: 'marketing.home.payg.ctaPrimary',
    href: MARKETING_HOME_PATHS.PAY_AS_YOU_GO,
  },
  secondaryLink: {
    labelKey: 'marketing.home.payg.ctaSecondary',
    href: MARKETING_HOME_PATHS.PRICING,
  },
};

/**
 * The teams band. Claims only what ships: per-deployment administration
 * (roles, users, plans, audit log). No seats, invitations or single sign-on —
 * those do not exist, and the administration page says so.
 */
export const MARKETING_HOME_TEAMS_BAND: HomeValueBand = {
  id: 'teams',
  eyebrowKey: 'marketing.home.teams.eyebrow',
  titleKey: 'marketing.home.teams.title',
  bodyKey: 'marketing.home.teams.body',
  points: [
    { titleKey: 'marketing.home.teams.point1Title', bodyKey: 'marketing.home.teams.point1Body' },
    { titleKey: 'marketing.home.teams.point2Title', bodyKey: 'marketing.home.teams.point2Body' },
    { titleKey: 'marketing.home.teams.point3Title', bodyKey: 'marketing.home.teams.point3Body' },
  ],
  primaryLink: {
    labelKey: 'marketing.home.teams.ctaPrimary',
    href: MARKETING_HOME_PATHS.ADMINISTRATION,
  },
  secondaryLink: {
    labelKey: 'marketing.home.teams.ctaSecondary',
    href: MARKETING_HOME_PATHS.CONTACT,
  },
};
