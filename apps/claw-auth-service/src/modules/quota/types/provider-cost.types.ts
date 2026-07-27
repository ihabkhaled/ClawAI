export type ProviderCostAggregateRow = {
  planId: string | null;
  costMicroUsd: bigint;
};

export type ProviderCostAggregateView = {
  planId: string | null;
  costMicroUsd: string;
};
