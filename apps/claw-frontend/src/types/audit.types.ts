import type { AuditAction, AuditSeverity } from "@/enums";

export interface AuditLog {
  _id: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface UsageEntry {
  _id: string;
  userId: string;
  resourceType: string;
  action: string;
  quantity: number;
  unit?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AggregationResult {
  _id: string;
  count: number;
}

export interface AuditStats {
  byAction: AggregationResult[];
  bySeverity: AggregationResult[];
  total: number;
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

export interface UsageSummary {
  byProvider: ProviderAggregation[];
  byModel: ModelAggregation[];
  totalRequests: number;
}

export interface CostSummary {
  totalTokens: number;
  totalRequests: number;
  estimatedCost: number;
}

export interface LatencySummary {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  totalRequests: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditListResponse {
  data: AuditLog[];
  meta: PaginationMeta;
}

export interface UsageListResponse {
  data: UsageEntry[];
  meta: PaginationMeta;
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  severity?: AuditSeverity;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface UsageListParams {
  page?: number;
  limit?: number;
  provider?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
}
