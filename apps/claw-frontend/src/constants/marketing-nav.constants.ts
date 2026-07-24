import type { MarketingNavLink } from '@/types';

// Phase A: only the homepage is published, so every concept link below
// points at a homepage anchor. Phase B repoints each entry at its own
// dedicated page as the content registry flips that slug to PUBLISHED —
// the labelKey/href pairs are the only lines that will need to change.
export const MARKETING_NAV_LINKS: ReadonlyArray<MarketingNavLink> = [
  { labelKey: 'marketing.header.navFeatures', href: '/#features' },
  { labelKey: 'marketing.header.navHowItWorks', href: '/#how-it-works' },
  { labelKey: 'marketing.header.navArchitecture', href: '/#architecture' },
  { labelKey: 'marketing.header.navLocalFirst', href: '/#local-first' },
  { labelKey: 'marketing.header.navUseCases', href: '/#use-cases' },
  { labelKey: 'marketing.header.navFaq', href: '/#faq' },
];

export const MARKETING_GITHUB_URL = 'https://github.com/ihabkhaled/ClawAI';
