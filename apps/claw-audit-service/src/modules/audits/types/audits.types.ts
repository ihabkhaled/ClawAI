export interface CreateAuditLogInput {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUsageLedgerInput {
  userId: string;
  resourceType: string;
  action: string;
  quantity: number;
  unit?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageLedgerFilters {
  userId?: string;
  resourceType?: string;
  action?: string;
  provider?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AggregationResult {
  _id: string;
  count: number;
}

export interface CostSummaryResult {
  totalTokens: number;
  totalRequests: number;
  estimatedCost: number;
}

export interface LatencySummaryResult {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  totalRequests: number;
}

export interface ProviderAggregation {
  provider: string;
  count: number;
  totalTokens: number;
}

export interface ModelAggregation {
  model: string;
  count: number;
  totalTokens: number;
}

export interface AuditStatsResponse {
  byAction: AggregationResult[];
  bySeverity: AggregationResult[];
  total: number;
}

export interface UsageSummaryResponse {
  byProvider: ProviderAggregation[];
  byModel: ModelAggregation[];
  totalRequests: number;
}
