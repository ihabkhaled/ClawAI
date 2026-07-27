import type { TranslateFunction } from '@/types/i18n.types';
import type { UserProfile } from '@/types/user.types';

export type AdminBillingSubscriptionCount = {
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  status: string;
  count: number;
};

export type AdminBillingDashboard = {
  from: string;
  to: string;
  revenueByCurrency: Array<{ currency: string; amountMinor: number }>;
  revenueMicroUsd: string;
  providerCostMicroUsd: string;
  marginMicroUsd: string;
  subscriptionCounts: AdminBillingSubscriptionCount[];
  churnedSubscriptions: number;
  churnBasisPoints: number;
  failedPayments: number;
};

export type UseAdminBillingDashboardResult = {
  t: TranslateFunction;
  locale: string;
  user: UserProfile | null;
  dashboard: AdminBillingDashboard | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  retry: () => void;
};

export type BillingMetricChartProps = {
  rows: AdminBillingSubscriptionCount[];
  t: TranslateFunction;
};
