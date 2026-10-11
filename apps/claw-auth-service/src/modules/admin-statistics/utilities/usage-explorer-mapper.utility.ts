import { UsageLeaderboardDimension } from '../enums/usage-cost-kind.enum';
import {
  type AdminUsageGroupRow,
  type AdminUsageMetrics,
  type AdminUsageRequestRow,
  type AdminUsageSeriesPoint,
  type AdminUsageUserRow,
  type ExplorerBucketRow,
  type ExplorerGroupRow,
  type ExplorerRequestRow,
  type ExplorerSumsRow,
} from '../types/admin-usage-explorer.types';
import { ADMIN_USAGE_UNKNOWN_WORKFLOW } from '../constants/admin-usage-analytics.constants';
import { EMPTY_EXPLORER_SUMS_ROW } from '../constants/admin-usage-explorer.constants';
import { parseBillingKind, parseCostKind, toCostSummary } from './usage-cost-kind.utility';
import { normalizeProviderKey, providerLabel } from './provider-label.utility';
import { toCount } from './usage-row-mapper.utility';

export function toMetrics(row: ExplorerSumsRow | undefined): AdminUsageMetrics {
  const r = row ?? EMPTY_EXPLORER_SUMS_ROW;
  return {
    requests: toCount(r.requests),
    inputTokens: toCount(r.input_tokens),
    outputTokens: toCount(r.output_tokens),
    cachedTokens: toCount(r.cached_tokens),
    cacheWriteTokens: toCount(r.cache_write_tokens),
    reasoningTokens: toCount(r.reasoning_tokens),
    weightedTokens: toCount(r.weighted_tokens),
    toolCalls: toCount(r.tool_calls),
    cost: toCostSummary({
      actualMicroUsd: r.actual_micro_usd,
      estimatedMicroUsd: r.estimated_micro_usd,
      priced: r.priced_requests,
      fallback: r.fallback_requests,
      unpriced: r.unpriced_requests,
      unmetered: r.unmetered_requests,
    }),
    creditRequests: r.credit_requests,
    allowanceRequests: r.allowance_requests,
    creditSpendMicroUsd: r.credit_spend_micro_usd,
    lastSeenAt: r.last_seen_at === null ? null : r.last_seen_at.toISOString(),
  };
}

export function toUserRow(row: ExplorerGroupRow): AdminUsageUserRow {
  return {
    userId: row.group_key,
    email: row.email,
    username: row.username,
    role: row.role,
    ...toMetrics(row),
  };
}

/** One leaderboard row. Provider names are normalised here and nowhere else. */
export function toGroupRow(
  row: ExplorerGroupRow,
  dimension: UsageLeaderboardDimension,
): AdminUsageGroupRow {
  const metrics = toMetrics(row);
  const base = {
    key: row.group_key,
    provider: null,
    providerLabel: null,
    model: null,
    userId: null,
    email: null,
    username: null,
  };
  switch (dimension) {
    case UsageLeaderboardDimension.PROVIDER:
      return {
        ...base,
        ...metrics,
        label: providerLabel(row.raw_provider),
        provider: normalizeProviderKey(row.raw_provider),
        providerLabel: providerLabel(row.raw_provider),
      };
    case UsageLeaderboardDimension.MODEL:
      return {
        ...base,
        ...metrics,
        label: row.model ?? row.group_key,
        provider: normalizeProviderKey(row.raw_provider),
        providerLabel: providerLabel(row.raw_provider),
        model: row.model,
      };
    case UsageLeaderboardDimension.USER:
      return {
        ...base,
        ...metrics,
        label: row.email ?? row.username ?? row.group_key,
        userId: row.group_key,
        email: row.email,
        username: row.username,
      };
    case UsageLeaderboardDimension.WORKFLOW:
      return { ...base, ...metrics, label: row.group_key || ADMIN_USAGE_UNKNOWN_WORKFLOW };
  }
}

export function toSeriesPoint(row: ExplorerBucketRow): AdminUsageSeriesPoint {
  return { bucketStart: row.bucket_start.toISOString(), ...toMetrics(row) };
}

export function toRequestRow(row: ExplorerRequestRow): AdminUsageRequestRow {
  return {
    id: row.id,
    at: row.created_at.toISOString(),
    provider: normalizeProviderKey(row.provider),
    providerLabel: providerLabel(row.provider),
    model: row.model,
    workflow: row.workflow ?? ADMIN_USAGE_UNKNOWN_WORKFLOW,
    status: row.state,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cachedTokens: row.cached_tokens,
    cacheWriteTokens: row.cache_write_tokens,
    reasoningTokens: row.reasoning_tokens,
    weightedTokens: row.weighted_tokens,
    toolCalls: row.tool_call_count,
    costMicroUsd: row.cost_micro_usd,
    costKind: parseCostKind(row.cost_kind),
    billing: parseBillingKind(row.billing),
  };
}

/** Cursor key of a grouped row. */
export function groupKey(row: ExplorerGroupRow): string {
  return row.group_key;
}

/** Cursor key of a single-request row. */
export function requestKey(row: ExplorerRequestRow): string {
  return row.id;
}
