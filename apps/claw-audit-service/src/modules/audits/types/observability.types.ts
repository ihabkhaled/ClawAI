export type FailureGroup = {
  action: string;
  /** The emitting area (`entityType`), or `unknown` for a legacy row. */
  source: string;
  severity: string;
  isSyncNoise: boolean;
  count: number;
  lastSeenAt: string;
};

export type CountEntry = { key: string; label: string; count: number };

export type FailuresResponse = {
  from: string;
  to: string;
  hours: number;
  includeSync: boolean;
  totals: {
    /** HIGH/CRITICAL events in the window, SYNC_* noise excluded. */
    failures: number;
    /** SYNC_* workspace-sync events in the window, always reported on their own. */
    syncNoise: number;
  };
  groups: {
    items: FailureGroup[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  bySource: CountEntry[];
  topProviders: CountEntry[];
  topModels: CountEntry[];
};

export type TracingDimension = 'provider' | 'model' | 'context';

export type TracingRow = {
  key: string;
  label: string;
  provider: string | null;
  model: string | null;
  requests: number;
  /** Requests that carried a latency measurement. */
  measuredRequests: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  totalTokens: number;
  /** Rows whose token count is the provider's own figure vs a local estimate. */
  providerReportedRequests: number;
  estimatedRequests: number;
  /** HIGH/CRITICAL audit events attributed to this provider/model, or null for the context view. */
  failureEvents: number | null;
  /** failureEvents / (requests + failureEvents); an approximation, see the endpoint docs. */
  errorRate: number | null;
};

export type TracingSignal = { action: string; count: number };

export type TracingResponse = {
  from: string;
  to: string;
  hours: number;
  dimension: TracingDimension;
  overall: {
    requests: number;
    measuredRequests: number;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
  };
  rows: {
    items: TracingRow[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  /** Retry / fallback / breaker / rate-limit events by action. */
  signals: TracingSignal[];
};

/** Raw aggregation shapes. */
export type FailureGroupDoc = {
  _id: { action: string; entityType?: string | null; severity: string };
  count: number;
  lastSeenAt: Date;
};

export type CountDoc = { _id: string | null; count: number };

export type FailuresFacetDoc = {
  groups: FailureGroupDoc[];
  groupsTotal: Array<{ total: number }>;
  totals: Array<{ _id: boolean; count: number }>;
  bySource: CountDoc[];
  providers: CountDoc[];
  models: CountDoc[];
};

export type TracingGroupDoc = {
  _id: string;
  provider: string | null;
  model: string | null;
  requests: number;
  measured: number;
  avgLatency: number | null;
  percentiles: Array<number | null> | null;
  p95: number | null;
  totalTokens: number;
  estimatedRequests: number;
};

export type TracingFacetDoc = {
  rows: TracingGroupDoc[];
  total: Array<{ total: number }>;
  overall: Array<{
    requests: number;
    measured: number;
    percentiles: Array<number | null> | null;
  }>;
};

export type FailureCountByKey = Map<string, number>;

export type FailuresWindow = { from: Date; to: Date; hours: number };

export type FailuresQuery = {
  hours: number;
  includeSync: boolean;
  search: string | null;
  sort: 'count' | 'lastSeen';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
};

export type TracingQuery = {
  hours: number;
  dimension: TracingDimension;
  search: string | null;
  sort: 'requests' | 'p95' | 'tokens';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
};

/** A Mongo aggregation expression yielding a normalised provider key. */
export type ProviderExpression = Record<string, unknown>;
