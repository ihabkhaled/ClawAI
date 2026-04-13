export type ProviderFailureStat = {
  provider: string;
  fallbackCount: number;
  totalCount: number;
  fallbackRate: number;
};

export type RecentFallback = {
  id: string;
  createdAt: string;
  selectedProvider: string;
  selectedModel: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  routingMode: string;
};

export type RecoveryStats = {
  totalDecisions: number;
  totalWithFallback: number;
  fallbackRate: number;
  providerStats: ProviderFailureStat[];
  recentFallbacks: RecentFallback[];
};
