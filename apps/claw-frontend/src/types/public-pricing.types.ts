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
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  featureGates?: EntitlementFeatureGates;
  prices: readonly PublicPlanPrice[];
  features: readonly PublicPlanFeature[];
};

export type PricingSectionProps = {
  initialPlans: PublicPlan[] | null;
  compact?: boolean;
  standalone?: boolean;
};

export type PublicPlanCardProps = {
  plan: PublicPlan;
  isYearly: boolean;
};

export type UsePublicPricingResult = {
  plans: PublicPlan[];
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
  error: Error | null;
  isYearly: boolean;
  selectMonthly: () => void;
  selectYearly: () => void;
  retry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
};
