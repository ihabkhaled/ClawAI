import {
  type AdminObsActivityBucket,
  type AdminObsBillingKind,
  type AdminObsBillingSplitLine,
  type AdminObsCost,
  type AdminObsDerived,
  type AdminObsDetail,
  type AdminObsEntityKind,
  type AdminObsEntityRow,
  type AdminObsHealth,
  type AdminObsKpiDelta,
  type AdminObsMetrics,
  type AdminObsOverview,
  type AdminObsSeriesPoint,
  type AdminObsSignupPoint,
  type AdminObsStats,
} from '@claw/shared-types';

import {
  EMPTY_OBS_SUMS_ROW,
  OBS_BASIS_POINTS,
  OBS_DAYS_IN_WEEK,
  OBS_DETAIL_MODELS_LIMIT,
  OBS_DETAIL_SPLIT_LIMIT,
  OBS_HOURS_IN_DAY,
  OBS_PERCENT_DECIMALS,
  OBS_RATIO_DECIMALS,
} from '../constants/admin-observability.constants';
import { type AdminUsageRange } from '../types/admin-usage-analytics.types';
import { ObservabilityEmailMode, ObservabilityEntity } from '../enums/usage-cost-kind.enum';
import {
  type ObservabilityActivityRow,
  type ObservabilityBillingRow,
  type ObservabilityBucketRow,
  type ObservabilityCountsRow,
  type ObservabilityDetailSplits,
  type ObservabilityGroupRow,
  type ObservabilityHealthRow,
  type ObservabilityPeopleRow,
  type ObservabilityShareBase,
  type ObservabilitySignupRow,
  type ObservabilitySumsRow,
} from '../types/admin-observability.types';
import {
  ADMIN_USAGE_UNKNOWN_WORKFLOW,
  MS_PER_DAY,
  MS_PER_HOUR,
} from '../constants/admin-usage-analytics.constants';
import { normalizeProviderKey, providerLabel } from './provider-label.utility';
import { parseBillingKind, toCostSummary } from './usage-cost-kind.utility';
import { maskEmail, toCount } from './usage-row-mapper.utility';

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundTo(numerator / denominator, OBS_RATIO_DECIMALS) : null;
}

function average(total: number, count: number): number | null {
  return count > 0 ? roundTo(total / count, OBS_PERCENT_DECIMALS) : null;
}

/** Integer division of non-negative BigInts, rounded half up. */
export function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

function percentOf(part: bigint, total: bigint): number | null {
  return total > 0n ? Number((part * OBS_BASIS_POINTS) / total) / 100 : null;
}

/** Settled cost plus the estimate of rows with no settled cost: the figure every cost column shows. */
export function totalCostMicroUsd(row: ObservabilitySumsRow | undefined): bigint {
  return row === undefined ? 0n : BigInt(row.actual_micro_usd) + BigInt(row.estimated_micro_usd);
}

export function shareBaseOf(row: ObservabilitySumsRow | undefined): ObservabilityShareBase {
  return { costMicroUsd: totalCostMicroUsd(row), requests: toCount(row?.requests) };
}

export function toObsCost(row: ObservabilitySumsRow): AdminObsCost {
  return toCostSummary({
    actualMicroUsd: row.actual_micro_usd,
    estimatedMicroUsd: row.estimated_micro_usd,
    priced: row.priced_requests,
    fallback: row.fallback_requests,
    unpriced: row.unpriced_requests,
    unmetered: row.unmetered_requests,
  });
}

export function toObsMetrics(
  row: ObservabilitySumsRow,
  distinct: { users: number | null; models: number | null } = { users: null, models: null },
): AdminObsMetrics {
  return {
    requests: toCount(row.requests),
    inputTokens: toCount(row.input_tokens),
    outputTokens: toCount(row.output_tokens),
    cachedTokens: toCount(row.cached_tokens),
    cacheWriteTokens: toCount(row.cache_write_tokens),
    reasoningTokens: toCount(row.reasoning_tokens),
    weightedTokens: toCount(row.weighted_tokens),
    toolCalls: toCount(row.tool_calls),
    cost: toObsCost(row),
    creditRequests: row.credit_requests,
    allowanceRequests: row.allowance_requests,
    creditSpendMicroUsd: row.credit_spend_micro_usd,
    allowanceCostMicroUsd: row.allowance_cost_micro_usd,
    firstSeenAt: row.first_seen_at === null ? null : row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at === null ? null : row.last_seen_at.toISOString(),
    activeDays: row.active_days,
    distinctUsers: distinct.users,
    distinctModels: distinct.models,
  };
}

/** Derived columns. Money stays BigInt until the final string; ratios are display-only numbers. */
export function toObsDerived(
  row: ObservabilitySumsRow,
  base: ObservabilityShareBase,
): AdminObsDerived {
  const requests = toCount(row.requests);
  const input = toCount(row.input_tokens);
  const output = toCount(row.output_tokens);
  const cached = toCount(row.cached_tokens);
  const cacheWrite = toCount(row.cache_write_tokens);
  const cost = totalCostMicroUsd(row);
  const tokens = input + output;
  const accuracyEstimated = BigInt(row.accuracy_estimated_micro_usd);
  return {
    costPerRequestMicroUsd: requests > 0 ? divideHalfUp(cost, BigInt(requests)).toString() : null,
    costPer1kTokensMicroUsd:
      tokens > 0 ? divideHalfUp(cost * 1000n, BigInt(tokens)).toString() : null,
    avgInputTokens: average(input, requests),
    avgOutputTokens: average(output, requests),
    toolCallsPerRequest: average(toCount(row.tool_calls), requests),
    cacheHitRate: ratio(cached, input + cached + cacheWrite),
    reasoningShare: ratio(toCount(row.reasoning_tokens), output),
    shareOfCostPct: percentOf(cost, base.costMicroUsd),
    shareOfRequestsPct: percentOf(BigInt(requests), BigInt(base.requests)),
    estimateAccuracy:
      accuracyEstimated > 0n
        ? roundTo(
            Number((BigInt(row.accuracy_actual_micro_usd) * OBS_BASIS_POINTS) / accuracyEstimated) /
              Number(OBS_BASIS_POINTS),
            OBS_RATIO_DECIMALS,
          )
        : null,
  };
}

export function toObsStats(
  row: ObservabilitySumsRow | undefined,
  base: ObservabilityShareBase,
): AdminObsStats {
  const safe = row ?? EMPTY_OBS_SUMS_ROW;
  return { metrics: toObsMetrics(safe), derived: toObsDerived(safe, base) };
}

export function toObsHealth(row: ObservabilityHealthRow | undefined): AdminObsHealth {
  const finalized = row?.finalized ?? 0;
  const released = row?.released ?? 0;
  const settled = finalized + released;
  return {
    finalized,
    released,
    inFlight: row?.in_flight ?? 0,
    staleReserved: row?.stale_reserved ?? 0,
    settleRate: ratio(finalized, settled),
    refundRate: ratio(released, settled),
    avgSettleMs: toMillis(row?.avg_ms),
    p50SettleMs: toMillis(row?.p50_ms),
    p95SettleMs: toMillis(row?.p95_ms),
  };
}

function toMillis(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Math.round(value);
}

function labelOf(
  row: ObservabilityGroupRow,
  entity: ObservabilityEntity,
  masked: string | null,
): string {
  switch (entity) {
    case ObservabilityEntity.PROVIDER:
      return providerLabel(row.raw_provider);
    case ObservabilityEntity.MODEL:
      return row.model ?? row.group_key;
    case ObservabilityEntity.USER:
      return masked ?? row.username ?? row.group_key;
    case ObservabilityEntity.PLAN:
      return row.plan_name ?? row.group_key;
    case ObservabilityEntity.WORKFLOW:
      return row.group_key === '' ? ADMIN_USAGE_UNKNOWN_WORKFLOW : row.group_key;
  }
}

function kindOf(entity: ObservabilityEntity): AdminObsEntityKind {
  switch (entity) {
    case ObservabilityEntity.USER:
      return 'USER';
    case ObservabilityEntity.PROVIDER:
      return 'PROVIDER';
    case ObservabilityEntity.MODEL:
      return 'MODEL';
    case ObservabilityEntity.PLAN:
      return 'PLAN';
    case ObservabilityEntity.WORKFLOW:
      return 'WORKFLOW';
  }
}

/** One list row. Provider names are normalised here and nowhere else. */
export function toEntityRow(
  row: ObservabilityGroupRow,
  entity: ObservabilityEntity,
  base: ObservabilityShareBase,
  emailMode: ObservabilityEmailMode,
  health: ObservabilityHealthRow | null,
): AdminObsEntityRow {
  const isUser = entity === ObservabilityEntity.USER;
  const hasProvider =
    entity === ObservabilityEntity.PROVIDER || entity === ObservabilityEntity.MODEL;
  const masked = isUser && row.email !== null ? maskEmail(row.email) : null;
  return {
    key: row.group_key,
    label: labelOf(row, entity, masked),
    kind: kindOf(entity),
    userId: isUser ? row.group_key : null,
    email: isUser && emailMode === ObservabilityEmailMode.FULL ? row.email : null,
    maskedEmail: masked,
    username: isUser ? row.username : null,
    role: isUser ? row.role : null,
    status: isUser ? row.status : null,
    signedUpAt: row.user_created_at === null ? null : row.user_created_at.toISOString(),
    provider: hasProvider ? normalizeProviderKey(row.raw_provider) : null,
    providerLabel: hasProvider ? providerLabel(row.raw_provider) : null,
    model: entity === ObservabilityEntity.MODEL ? row.model : null,
    planId: row.plan_id,
    planName: row.plan_name,
    metrics: toObsMetrics(row, { users: row.distinct_users, models: row.distinct_models }),
    derived: toObsDerived(row, base),
    health: health === null ? null : toObsHealth(health),
  };
}

function toDetailBlock(
  rows: ObservabilityGroupRow[],
  target: ObservabilityEntity,
  cap: number,
  base: ObservabilityShareBase,
): AdminObsEntityRow[] {
  return rows
    .slice(0, cap)
    .map((row) => toEntityRow(row, target, base, ObservabilityEmailMode.MASKED, null));
}

/**
 * The five breakdown blocks of a detail page, each cut to its cap with shares taken
 * against the entity itself. `truncated` is true when any block had a row past its cap.
 */
export function toDetailBlocks(
  splits: ObservabilityDetailSplits,
  base: ObservabilityShareBase,
): Pick<AdminObsDetail, 'models' | 'providers' | 'users' | 'plans' | 'workflows' | 'truncated'> {
  return {
    models: toDetailBlock(splits.models, ObservabilityEntity.MODEL, OBS_DETAIL_MODELS_LIMIT, base),
    providers: toDetailBlock(
      splits.providers,
      ObservabilityEntity.PROVIDER,
      OBS_DETAIL_SPLIT_LIMIT,
      base,
    ),
    users: toDetailBlock(splits.users, ObservabilityEntity.USER, OBS_DETAIL_SPLIT_LIMIT, base),
    plans: toDetailBlock(splits.plans, ObservabilityEntity.PLAN, OBS_DETAIL_SPLIT_LIMIT, base),
    workflows: toDetailBlock(
      splits.workflows,
      ObservabilityEntity.WORKFLOW,
      OBS_DETAIL_SPLIT_LIMIT,
      base,
    ),
    truncated:
      splits.models.length > OBS_DETAIL_MODELS_LIMIT ||
      splits.providers.length > OBS_DETAIL_SPLIT_LIMIT ||
      [splits.users, splits.plans, splits.workflows].some(
        (rows) => rows.length > OBS_DETAIL_SPLIT_LIMIT,
      ),
  };
}

export function toObsSeriesPoint(row: ObservabilityBucketRow): AdminObsSeriesPoint {
  return {
    bucketStart: row.bucket_start.toISOString(),
    requests: toCount(row.requests),
    inputTokens: toCount(row.input_tokens),
    outputTokens: toCount(row.output_tokens),
    weightedTokens: toCount(row.weighted_tokens),
    toolCalls: toCount(row.tool_calls),
    costMicroUsd: (BigInt(row.actual_micro_usd) + BigInt(row.estimated_micro_usd)).toString(),
    activeUsers: row.active_users,
  };
}

export function toSignupPoint(row: ObservabilitySignupRow): AdminObsSignupPoint {
  return { bucketStart: row.bucket_start.toISOString(), count: row.total };
}

/**
 * Every bucket start from the window's first bucket up to (excluding) `to`, at the
 * range grain, in UTC. Epoch flooring lines up with Postgres `date_trunc` on a UTC timestamp.
 */
function bucketStarts(range: AdminUsageRange): Date[] {
  const step = range.grain === 'HOUR' ? MS_PER_HOUR : MS_PER_DAY;
  const starts: Date[] = [];
  for (
    let at = Math.floor(range.from.getTime() / step) * step;
    at < range.to.getTime();
    at += step
  ) {
    starts.push(new Date(at));
  }
  return starts;
}

/** The usage series with a point for EVERY bucket of the window; a quiet bucket is an explicit zero. */
export function toFilledSeries(
  rows: ObservabilityBucketRow[],
  range: AdminUsageRange,
): AdminObsSeriesPoint[] {
  const byStart = new Map(rows.map((row) => [row.bucket_start.getTime(), toObsSeriesPoint(row)]));
  return bucketStarts(range).map(
    (start) =>
      byStart.get(start.getTime()) ??
      toObsSeriesPoint({ ...EMPTY_OBS_SUMS_ROW, bucket_start: start, active_users: 0 }),
  );
}

/** The signups series with a point for every bucket of the window. */
export function toFilledSignups(
  rows: ObservabilitySignupRow[],
  range: AdminUsageRange,
): AdminObsSignupPoint[] {
  const byStart = new Map(rows.map((row) => [row.bucket_start.getTime(), toSignupPoint(row)]));
  return bucketStarts(range).map(
    (start) => byStart.get(start.getTime()) ?? toSignupPoint({ bucket_start: start, total: 0 }),
  );
}

function fillActivity(
  rows: ObservabilityActivityRow[],
  first: number,
  count: number,
): AdminObsActivityBucket[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return Array.from({ length: count }, (_, index) => {
    const bucket = first + index;
    const row = byBucket.get(bucket);
    return { bucket, requests: row?.requests ?? 0, costMicroUsd: row?.cost_micro_usd ?? '0' };
  });
}

/** Hours 0-23, every hour present so a chart has no gaps. */
export function toHourOfDay(rows: ObservabilityActivityRow[]): AdminObsActivityBucket[] {
  return fillActivity(rows, 0, OBS_HOURS_IN_DAY);
}

/** ISO weekdays 1 (Monday) to 7 (Sunday), every day present. */
export function toDayOfWeek(rows: ObservabilityActivityRow[]): AdminObsActivityBucket[] {
  return fillActivity(rows, 1, OBS_DAYS_IN_WEEK);
}

export function toBillingSplit(rows: ObservabilityBillingRow[]): AdminObsBillingSplitLine[] {
  return rows.map((row) => ({
    billing: parseBillingKind(row.billing) as AdminObsBillingKind,
    requests: row.requests,
    costMicroUsd: row.cost_micro_usd,
  }));
}

/** Percent change with 2 decimals; null when the previous period was zero. */
export function toKpiDelta(current: bigint, previous: bigint): AdminObsKpiDelta {
  return {
    current: current.toString(),
    previous: previous.toString(),
    changePct:
      previous > 0n ? Number(((current - previous) * OBS_BASIS_POINTS) / previous) / 100 : null,
  };
}

/** A group with no rows behind it, for a detail page whose entity has no usage in the window. */
export function emptyGroupRow(
  key: string,
  rawProvider: string | null,
  model: string | null,
): ObservabilityGroupRow {
  return {
    ...EMPTY_OBS_SUMS_ROW,
    group_key: key,
    sort_val: '0',
    total_groups: 0,
    email: null,
    username: null,
    role: null,
    status: null,
    user_created_at: null,
    raw_provider: rawProvider,
    model,
    plan_id: null,
    plan_name: null,
    distinct_users: 0,
    distinct_models: null,
  };
}

function tokensOf(row: ObservabilitySumsRow | undefined): bigint {
  return row === undefined ? 0n : row.input_tokens + row.output_tokens;
}

/** The five hub KPI deltas, current window against the equal window before it. */
export function toOverviewDeltas(
  current: { totals: ObservabilitySumsRow | undefined; people: ObservabilityPeopleRow | undefined },
  previous: {
    totals: ObservabilitySumsRow | undefined;
    people: ObservabilityPeopleRow | undefined;
  },
): AdminObsOverview['deltas'] {
  return {
    requests: toKpiDelta(
      BigInt(current.totals?.requests ?? 0),
      BigInt(previous.totals?.requests ?? 0),
    ),
    costMicroUsd: toKpiDelta(totalCostMicroUsd(current.totals), totalCostMicroUsd(previous.totals)),
    tokens: toKpiDelta(tokensOf(current.totals), tokensOf(previous.totals)),
    toolCalls: toKpiDelta(current.totals?.tool_calls ?? 0n, previous.totals?.tool_calls ?? 0n),
    activeUsers: toKpiDelta(
      BigInt(current.people?.active_users ?? 0),
      BigInt(previous.people?.active_users ?? 0),
    ),
  };
}

export function toObsCounts(row: ObservabilityCountsRow | undefined): AdminObsOverview['counts'] {
  return {
    providers: row?.providers ?? 0,
    models: row?.models ?? 0,
    plans: row?.plans ?? 0,
    workflows: row?.workflows ?? 0,
  };
}

/** The header row of a provider or model detail whose entity has no usage in the window. */
export function emptyDetailRow(
  entity: ObservabilityEntity,
  provider: string | null,
  model: string | null,
): ObservabilityGroupRow {
  return entity === ObservabilityEntity.PROVIDER
    ? emptyGroupRow(provider ?? '', provider, null)
    : emptyGroupRow(`${provider ?? ''}/${model ?? ''}`, provider, model);
}
