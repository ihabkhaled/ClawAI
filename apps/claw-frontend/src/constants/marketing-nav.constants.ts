import type { MarketingNavLink } from '@/types';

// Phase B: every concept now has its own page, so the nav points at real
// routes instead of homepage anchors. Each href here MUST correspond to a
// PUBLISHED entry in CONTENT_REGISTRY — a link to a PLANNED slug would be a
// noindex dead end.
//
// `navLocalFirst` keeps its key name for translation stability, but the label
// and destination are the ORGANISATION-facing private-deployment page, not a
// product-identity claim.
export const MARKETING_NAV_LINKS: ReadonlyArray<MarketingNavLink> = [
  { labelKey: 'marketing.header.navFeatures', href: '/features' },
  { labelKey: 'marketing.header.navHowItWorks', href: '/how-it-works' },
  { labelKey: 'marketing.header.navPricing', href: '/pricing' },
  { labelKey: 'marketing.header.navUseCases', href: '/use-cases' },
  { labelKey: 'marketing.header.navEnterprise', href: '/local-first-ai' },
];

export const MARKETING_GITHUB_URL = 'https://github.com/ihabkhaled/ClawAI';
