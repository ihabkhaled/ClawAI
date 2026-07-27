export type TransactionMetricRow = {
  currency: string;
  type: string;
  status: string;
  amountMinor: number;
  count: number;
};

export type SubscriptionMetricRow = {
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  status: string;
  count: number;
};

export type ProviderCostMetric = {
  planId: string | null;
  costMicroUsd: string;
};

export type PriceVersionSubscriberCount = {
  planPriceVersionId: string;
  count: number;
};

export type BillingDashboardView = {
  from: string;
  to: string;
  revenueByCurrency: Array<{ currency: string; amountMinor: number }>;
  revenueMicroUsd: string;
  providerCostMicroUsd: string;
  marginMicroUsd: string;
  subscriptionCounts: SubscriptionMetricRow[];
  churnedSubscriptions: number;
  churnBasisPoints: number;
  failedPayments: number;
};
