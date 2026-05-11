export type ObservabilitySummary = {
  windowStart: Date;
  windowEnd: Date;
  totalRoutes: number;
  routesByProvider: Record<string, number>;
  routesByModel: Record<string, number>;
  routesByMode: Record<string, number>;
  routesByDomain: Record<string, number>;
  averageConfidence: number;
  manualOverrideRate: number;
  noExecutionModelCount: number;
};

export type ObservabilityFilter = {
  from: Date;
  to: Date;
};
