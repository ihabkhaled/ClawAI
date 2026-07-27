import type { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

export type PublicLaunchSection = {
  id: string;
  title: string;
  body: string;
};

export type PublicLaunchPageContent = {
  eyebrow: string;
  sections: readonly [
    PublicLaunchSection,
    PublicLaunchSection,
    PublicLaunchSection,
    PublicLaunchSection,
  ];
  evidence: string;
};

export type PublicLaunchPageDictionary = Record<PublicLaunchPageSlug, PublicLaunchPageContent>;

export type PublicLaunchLabels = {
  onThisPage: string;
  evidence: string;
  lastReviewed: string;
  effectiveDate: string;
  startFree: string;
  contactTeam: string;
  viewPricing: string;
  readSecurity: string;
  baselineCatalog: string;
  monthlyPrice: string;
  yearlyPrice: string;
  dailyAllowance: string;
  monthlyAllowance: string;
  liveCheckoutNote: string;
  providerAvailabilityNote: string;
  routingRailTitle: string;
  routingRailSummary: string;
  routingRailAlternative: string;
  evaluate: string;
  evaluateDescription: string;
  route: string;
  routeDescription: string;
  compare: string;
  compareDescription: string;
  receipt: string;
  receiptDescription: string;
};

export type PublicLaunchPageProps = {
  slug: PublicLaunchPageSlug;
};
