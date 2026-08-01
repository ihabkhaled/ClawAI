import { type PlanFeatureKey } from '../../../generated/prisma';

/**
 * One quota window as the billing page shows it.
 *
 * `limit: null` means unlimited and `limit: 0` means disabled. They are
 * different states and are never collapsed — telling a user with a disabled
 * feature that they have unlimited access is the worse of the two mistakes.
 */
export type UsageWindowView = {
  used: number;
  limit: number | null;
  remaining: number | null;
  // Which day/week/month the counters belong to, so a stale render is
  // recognisable rather than silently wrong across a period rollover.
  periodKey: string;
};

export type FeatureAllowanceView = {
  feature: PlanFeatureKey;
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  window: string | null;
};

/**
 * The whole usage picture for one user.
 *
 * Deliberately omits the provider-cost counter. That budget is an operational
 * margin control, not a product limit, and a customer reading it would treat it
 * as a cap on what they are allowed to do.
 */
export type UserUsageView = {
  day: UsageWindowView;
  week: UsageWindowView;
  month: UsageWindowView;
  features: FeatureAllowanceView[];
};

/**
 * The plan fields a usage view actually reads.
 *
 * Narrower than the full Plan row on purpose: this service has no business
 * touching monthlyProviderCostCeilingMicroUsd, which is a margin control.
 */
export type UsagePlanLimits = {
  id: string;
  dailyTokenQuota: number | null;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
};

export type UsageDateRange = {
  fromDate: string;
  throughDate: string;
};

export type UsageDateRanges = {
  day: UsageDateRange;
  week: UsageDateRange;
  month: UsageDateRange;
};

export type UsagePlanContext = {
  plan: UsagePlanLimits | null;
  observeUnmeteredFeatures: boolean;
};
