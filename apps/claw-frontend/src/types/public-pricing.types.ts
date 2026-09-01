import type { BillingInterval } from '@/enums/billing.enum';
import type { EntitlementFeatureGates } from '@/types/plan.types';

export type PublicPlanPrice = {
  id: string;
  planId: string;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  version: number;
  isActive: boolean;
};

export type PublicPlanFeature = {
  feature: string;
  accessMode: string;
  limit: number | null;
  window: string | null;
};

export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  /** The plan a new signup is granted. */
  isDefault: boolean;
  /** The plan this page badges "Most popular". */
  isPopular: boolean;
  dailyTokenQuota: number | null;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
  /**
   * The share of the plan's monthly price that becomes connector credit, in
   * basis points. 3000 is 30%; the column is bounded 0..10000 in the database.
   *
   * The credit is NOT a figure stored per plan. It is derived at render time by
   * `monthlyCreditFromPlan(activeMonthlyPrice.amountMinor, bps)`, so a price
   * change moves the allowance with it and the two can never disagree. A plan
   * priced at $0 therefore grants $0 of credit, which is the intended answer.
   *
   * Never written into i18n copy: an allowance in thirteen locale files is
   * thirteen numbers an operator has to remember to change, and the first edit
   * that misses one publishes a price we do not honour.
   */
  paygCreditPercentBps: number;
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  featureGates?: EntitlementFeatureGates;
  prices: readonly PublicPlanPrice[];
  features: readonly PublicPlanFeature[];
};

/**
 * A catalog entry exactly as an auth service may send it.
 *
 * `paygCreditPercentBps` is optional here and required on {@link PublicPlan} on
 * purpose: an older auth service omits the column entirely, and the honest place
 * to admit that is the parse boundary rather than every card that reads a plan.
 */
export type PublicPlanResponse = Omit<PublicPlan, 'paygCreditPercentBps'> & {
  paygCreditPercentBps?: number;
};

export type PricingSectionProps = {
  initialPlans: PublicPlan[] | null;
  compact?: boolean;
  standalone?: boolean;
};

export type PublicPlanCardProps = {
  plan: PublicPlan;
  interval: BillingInterval;
};

export type UsePublicPricingResult = {
  plans: PublicPlan[];
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
  error: Error | null;
  interval: BillingInterval;
  selectInterval: (interval: BillingInterval) => void;
  retry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
};
