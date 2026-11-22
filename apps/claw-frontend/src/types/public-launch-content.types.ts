import type { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

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

/** The two commerce policies (delivery, refund) that ship real copy in every locale. */
export type PublicCommercePolicySlug =
  PublicLaunchPageSlug.DELIVERY_SHIPPING | PublicLaunchPageSlug.REFUND_CANCELLATION;

export type PublicCommercePolicyDictionary = Record<
  PublicCommercePolicySlug,
  PublicLaunchPageContent
>;

/** The launch pages whose body is still English in every locale. */
export type PublicLaunchCorePageDictionary = Omit<
  PublicLaunchPageDictionary,
  PublicCommercePolicySlug
>;

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
  companyDetailsTitle: string;
  emailLabel: string;
  phoneLabel: string;
  addressLabel: string;
  addressNote: string;
};

/**
 * The page chrome every launch page shows, translated per locale. The rest of
 * `PublicLaunchLabels` still falls back to English.
 */
export type PublicLaunchLocalizedLabels = {
  onThisPage: string;
  evidence: string;
  lastReviewed: string;
  effectiveDate: string;
  startFree: string;
  contactTeam: string;
  companyDetailsTitle: string;
  emailLabel: string;
  phoneLabel: string;
  addressLabel: string;
  addressNote: string;
};

/** One locale's commerce-policy copy: page bodies, chrome labels and SEO. */
export type PublicCommercePolicyLocaleContent = {
  pages: PublicCommercePolicyDictionary;
  labels: PublicLaunchLocalizedLabels;
  seo: Record<PublicCommercePolicySlug, PublicPageSeoCopy>;
};

export type CompanyContactCardProps = {
  title: string;
  emailLabel: string;
  phoneLabel: string;
  addressLabel: string;
  note: string;
};

export type PublicLaunchPageProps = {
  slug: PublicLaunchPageSlug;
};
