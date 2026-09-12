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

/**
 * The plan fields an auth service MAY omit.
 *
 * Split out rather than listed as an `Omit<…>` key union so the "an older
 * service does not send these" idea is stated once and stays readable — and so
 * adding another such field does not mean editing a string list in two places.
 * Required on {@link PublicPlan}, optional on {@link PublicPlanResponse}: the
 * honest place to admit a field may be missing is the parse boundary, not every
 * card that reads a plan.
 */
type PublicPlanNegotiableFields = {
  /** False hides the plan from this page entirely. */
  isPublic: boolean;
  /** False means the plan is no longer sold; existing subscribers keep it. */
  isActive: boolean;
  /** ISO 4217. Null only on legacy rows that predate the column. */
  currency: string | null;
  isTrial: boolean;
  trialDurationDays: number | null;
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
};

type PublicPlanCoreFields = {
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
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  featureGates?: EntitlementFeatureGates;
  prices: readonly PublicPlanPrice[];
  features: readonly PublicPlanFeature[];
};

/** A plan as the pages consume it: every field resolved. */
export type PublicPlan = PublicPlanCoreFields & PublicPlanNegotiableFields;

/** A catalog entry exactly as an auth service may send it. */
export type PublicPlanResponse = PublicPlanCoreFields & Partial<PublicPlanNegotiableFields>;

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
  error: Error | null;
  interval: BillingInterval;
  selectInterval: (interval: BillingInterval) => void;
  retry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
};
