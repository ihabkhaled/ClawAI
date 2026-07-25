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
} as const;

// Plan slugs kept when the pricing block is asked for a `compact` render
// (an embed that only needs the headline tiers). The home page renders the
// full ladder, so it does not pass `compact`.
export const MARKETING_COMPACT_PLAN_SLUGS: ReadonlyArray<string> = ['free', 'pro', 'unlimited'];

// Proof points shown in the organisations band. This is the ONE place on the
// home page where on-premise/self-managed deployment is offered, and it is
// scoped to companies — it is a contact-sales conversation, never a
// self-serve individual plan.
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
