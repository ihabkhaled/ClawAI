import { type AdminUsageRange, type AdminUsageRangeInput } from './admin-usage-analytics.types';
import {
  type UsageBillingKind,
  type UsageCostKind,
  type UsageLeaderboardDimension,
  type UsageRequestSortField,
  type UsageSortField,
} from '../enums/usage-cost-kind.enum';

/** Raw aggregate row every grouped explorer query returns (Postgres bigint arrives as BigInt). */
export type ExplorerSumsRow = {
  requests: number;
  input_tokens: bigint;
  output_tokens: bigint;
  cached_tokens: bigint;
  cache_write_tokens: bigint;
  reasoning_tokens: bigint;
  weighted_tokens: bigint;
  tool_calls: bigint;
  actual_micro_usd: string;
  estimated_micro_usd: string;
  priced_requests: number;
  fallback_requests: number;
  unmetered_requests: number;
  unpriced_requests: number;
  credit_requests: number;
  allowance_requests: number;
  credit_spend_micro_usd: string;
  last_seen_at: Date | null;
};

export type ExplorerGroupRow = ExplorerSumsRow & {
  group_key: string;
  sort_val: string;
  email: string | null;
  username: string | null;
  role: string | null;
  raw_provider: string | null;
  model: string | null;
};

export type ExplorerBucketRow = ExplorerSumsRow & { bucket_start: Date };

export type ExplorerRequestRow = {
  id: string;
  created_at: Date;
  provider: string;
  model: string;
  workflow: string | null;
  state: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  weighted_tokens: number;
  tool_call_count: number;
  cost_micro_usd: string;
  cost_kind: string;
  billing: string;
  sort_val: string;
};

export type ExplorerOptionRow = { value: string };
export type ExplorerCountRow = { total: number };

export type ExplorerUserIdentityRow = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
};

/** Filters shared by every explorer query. `null` means "not filtered". */
export type ExplorerScope = {
  userId: string | null;
  from: Date;
  to: Date;
  /** Normalised provider key (see `normalizeProviderKey`). */
  provider: string | null;
  model: string | null;
  workflow: string | null;
  billing: UsageBillingKind | null;
};

export type ExplorerCursor = { v: string; id: string };

export type GroupPageQuery = {
  scope: ExplorerScope;
  dimension: UsageLeaderboardDimension;
  search: string | null;
  sort: UsageSortField;
  descending: boolean;
  limit: number;
  cursor: ExplorerCursor | null;
};

export type RequestPageQuery = {
  scope: ExplorerScope;
  search: string | null;
  sort: UsageRequestSortField;
  descending: boolean;
  limit: number;
  cursor: ExplorerCursor | null;
};

/** Cost block. `partial` = some rows carry no price, so the figure understates real spend. */
export type AdminUsageCostSummary = {
  costMicroUsd: string;
  actualMicroUsd: string;
  estimatedMicroUsd: string;
  costKind: UsageCostKind;
  pricedRequests: number;
  estimatedRequests: number;
  unpricedRequests: number;
  unmeteredRequests: number;
  partial: boolean;
};

export type AdminUsageMetrics = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  cost: AdminUsageCostSummary;
  creditRequests: number;
  allowanceRequests: number;
  creditSpendMicroUsd: string;
  lastSeenAt: string | null;
};

export type AdminUsageUserRow = AdminUsageMetrics & {
  userId: string;
  /** FULL address: admin-only, and every open of a user's view is audited. */
  email: string | null;
  username: string | null;
  role: string | null;
};

export type AdminUsageGroupRow = AdminUsageMetrics & {
  key: string;
  label: string;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  userId: string | null;
  email: string | null;
  username: string | null;
};

export type AdminUsagePage<T> = {
  from: string;
  to: string;
  generatedAt: string;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
  items: T[];
  nextCursor: string | null;
};

export type AdminUsageUsersPage = AdminUsagePage<AdminUsageUserRow> & { matchedUsers: number };
export type AdminUsageLeaderboardPage = AdminUsagePage<AdminUsageGroupRow> & {
  dimension: UsageLeaderboardDimension;
};

export type AdminUsageSeriesPoint = AdminUsageMetrics & { bucketStart: string };

export type AdminUsageTimeseries = {
  from: string;
  to: string;
  generatedAt: string;
  grain: 'HOUR' | 'DAY';
  totals: AdminUsageMetrics;
  series: AdminUsageSeriesPoint[];
};

export type AdminUsageRequestRow = {
  id: string;
  at: string;
  provider: string;
  providerLabel: string;
  model: string;
  workflow: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  costMicroUsd: string;
  costKind: UsageCostKind;
  billing: UsageBillingKind;
};

export type AdminUsageRequestsPage = AdminUsagePage<AdminUsageRequestRow>;

export type AdminUsageUserIdentity = {
  userId: string;
  /** FULL address, admin-only. */
  email: string;
  username: string;
  role: string;
  status: string;
};

export type AdminUsageFilterOptions = {
  providers: Array<{ value: string; label: string }>;
  models: string[];
  workflows: string[];
};

export type AdminUserConsumptionDetail = {
  user: AdminUsageUserIdentity;
  from: string;
  to: string;
  generatedAt: string;
  grain: 'HOUR' | 'DAY';
  filters: {
    provider: string | null;
    model: string | null;
    workflow: string | null;
    billing: UsageBillingKind | null;
  };
  totals: AdminUsageMetrics;
  models: AdminUsageGroupRow[];
  providers: AdminUsageGroupRow[];
  workflows: AdminUsageGroupRow[];
  /** True when a breakdown table hit its cap; the full set is on the leaderboard endpoint. */
  breakdownTruncated: boolean;
  series: AdminUsageSeriesPoint[];
  heaviestRequests: AdminUsageRequestRow[];
  filterOptions: AdminUsageFilterOptions;
};

/** What the read audit trail records: filters and ids only, never an email. */
export type AdminUsageAuditPayload = {
  actorUserId: string;
  targetUserId: string | null;
  at: string;
  filters: Record<string, string | number | boolean | null>;
};

/** Range plus the filters a caller may send, before they are resolved against "now". */
export type ExplorerScopeInput = AdminUsageRangeInput & {
  provider?: string | undefined;
  model?: string | undefined;
  workflow?: string | undefined;
  billing?: UsageBillingKind | undefined;
};

export type ExplorerResolvedScope = { scope: ExplorerScope; range: AdminUsageRange };

/** How many rows of each cost kind an aggregate holds. */
export type UsageCostCounts = {
  priced: number;
  fallback: number;
  unpriced: number;
  unmetered: number;
};
