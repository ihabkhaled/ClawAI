import { UNKNOWN_WORKFLOW } from '@/constants/observability-explorer.constants';
import { MS_PER_DAY, MS_PER_HOUR } from '@/constants/usage-analytics.constants';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageRangeSelection } from '@/types/admin-usage-analytics.types';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  AdminUsageGroupRow,
  AdminUsageSeriesPoint,
  BarDatum,
  ChartPoint,
  ChartSeries,
  CountByKey,
  DonutSlice,
  ExplorerFilters,
  UsageGrain,
  ExplorerParams,
  SortOrder,
} from '@/types/observability-explorer.types';
import { buildRangeQuery, formatBucketLabel } from '@/utilities/usage-analytics.utility';

const MICRO_PER_USD = 1_000_000n;
const DISPLAY_DECIMALS = 4;

function parseMicro(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/** Integer micro-USD string as a number for chart geometry only (never for money maths). */
export function microToNumber(value: string): number {
  return Number(parseMicro(value)) / Number(MICRO_PER_USD);
}

/** Integer micro-USD string as `$1.2345`. Sub-0.0001 amounts show as `<$0.0001`, never as zero. */
export function formatUsd(value: string): string {
  const amount = parseMicro(value);
  if (amount === 0n) {
    return '$0';
  }
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / MICRO_PER_USD;
  const fraction = (absolute % MICRO_PER_USD).toString().padStart(6, '0');
  const shown = fraction.slice(0, DISPLAY_DECIMALS);
  if (whole === 0n && /^0+$/u.test(shown)) {
    return `<$0.${'0'.repeat(DISPLAY_DECIMALS - 1)}1`;
  }
  return `${negative ? '-' : ''}$${whole.toString()}.${shown}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatLatency(value: number | null): string {
  return value === null ? '-' : `${Math.round(value).toLocaleString()} ms`;
}

export function formatRate(value: number | null): string {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`;
}

/** `2026-10-05T11:30:00.000Z` as `2026-10-05 11:30` (UTC). */
export function formatTimestamp(iso: string | null): string {
  return iso === null ? '-' : iso.slice(0, 16).replace('T', ' ');
}

/** The full email when there is one, else the username, else the id. */
export function userDisplayName(user: {
  email: string | null;
  username: string | null;
  userId: string | null;
}): string {
  return user.email ?? user.username ?? user.userId ?? '-';
}

/** A workflow code for display; the server's UNKNOWN is never shown as a real surface. */
export function workflowLabel(workflow: string, t: TranslateFunction): string {
  return workflow === UNKNOWN_WORKFLOW || workflow === ''
    ? t('observabilityExplorer.workflowUnknown')
    : workflow;
}

/** Selected range and non-empty filters as query-string params. */
export function buildExplorerParams(
  selection: UsageRangeSelection,
  filters: ExplorerFilters,
  now: Date,
): ExplorerParams {
  const params: ExplorerParams = {};
  for (const [key, value] of Object.entries(buildRangeQuery(selection, now))) {
    if (value !== undefined) {
      params[key] = String(value);
    }
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '') {
      params[key] = value;
    }
  }
  return params;
}

/** Hours back from `now` that a selection covers, clamped to 1..maxHours, for hours-only endpoints. */
export function selectionToHours(
  selection: UsageRangeSelection,
  now: Date,
  maxHours: number,
): { hours: number; clamped: boolean } {
  let hours: number;
  switch (selection.preset) {
    case UsageRangePreset.Today: {
      const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      hours = Math.ceil((now.getTime() - start) / MS_PER_HOUR);
      break;
    }
    case UsageRangePreset.Hours:
      hours = selection.hours;
      break;
    case UsageRangePreset.Week:
      hours = 7 * 24;
      break;
    case UsageRangePreset.Month:
      hours = 30 * 24;
      break;
    case UsageRangePreset.Custom: {
      const from = Date.parse(`${selection.customFrom}T00:00:00.000Z`);
      hours = Number.isNaN(from) ? 24 : Math.ceil((now.getTime() - from) / MS_PER_HOUR);
      break;
    }
  }
  const whole = Math.max(1, Math.floor(hours));
  return { hours: Math.min(whole, maxHours), clamped: whole > maxHours };
}

/** Next sort state when a column header is activated: same column flips, a new one starts descending. */
export function nextSort(
  currentSort: string,
  currentOrder: SortOrder,
  column: string,
): { sort: string; order: SortOrder } {
  if (column === currentSort) {
    return { sort: column, order: currentOrder === 'desc' ? 'asc' : 'desc' };
  }
  return { sort: column, order: 'desc' };
}

export function ariaSortValue(
  column: string,
  sort: string,
  order: SortOrder,
): 'ascending' | 'descending' | 'none' {
  if (column !== sort) {
    return 'none';
  }
  return order === 'asc' ? 'ascending' : 'descending';
}

export function totalTokens(metrics: { inputTokens: number; outputTokens: number }): number {
  return metrics.inputTokens + metrics.outputTokens;
}

/** Whole days between two ISO instants, at least 1. Used for the "per day" caption. */
export function spanDays(from: string, to: string): number {
  return Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY));
}

/** Request counts as a share of the total, whole percent. */
export function sharePercent(value: number, total: number): number {
  return total <= 0 ? 0 : Math.round((value / total) * 100);
}

export function buildBucketLabels(points: AdminUsageSeriesPoint[], grain: UsageGrain): string[] {
  return points.map((point) => formatBucketLabel(point.bucketStart, grain));
}

export function buildRequestPoints(
  points: AdminUsageSeriesPoint[],
  grain: UsageGrain,
): ChartPoint[] {
  return points.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: point.requests,
  }));
}

export function buildCostPoints(points: AdminUsageSeriesPoint[], grain: UsageGrain): ChartPoint[] {
  return points.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: microToNumber(point.cost.costMicroUsd),
  }));
}

/** Input and output tokens per bucket as stacked series. */
export function buildTokenSeries(
  points: AdminUsageSeriesPoint[],
  names: { input: string; output: string },
): ChartSeries[] {
  return [
    { key: 'input', label: names.input, colorIndex: 0, values: points.map((p) => p.inputTokens) },
    {
      key: 'output',
      label: names.output,
      colorIndex: 1,
      values: points.map((p) => p.outputTokens),
    },
  ];
}

/** Ranked rows as bar data, largest first, capped so the chart stays readable. */
export function buildBarData(
  rows: AdminUsageGroupRow[],
  valueOf: (row: AdminUsageGroupRow) => number,
  labelOf: (row: AdminUsageGroupRow) => string,
  limit: number,
): BarDatum[] {
  return rows
    .map((row) => ({ key: row.key, label: labelOf(row), value: valueOf(row) }))
    .filter((datum) => datum.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function buildDonutSlices(
  rows: AdminUsageGroupRow[],
  valueOf: (row: AdminUsageGroupRow) => number,
  labelOf: (row: AdminUsageGroupRow) => string,
): DonutSlice[] {
  return rows.map((row) => ({ key: row.key, label: labelOf(row), value: valueOf(row) }));
}

/** Integer micro-USD string as a number of micro-USD, for chart bar lengths only. */
export function microAsNumber(value: string): number {
  return Number(parseMicro(value));
}

/** The display name of a ranked row for its grouping. */
export function groupRowLabel(
  row: AdminUsageGroupRow,
  dimension: UsageLeaderboardDimension,
  t: TranslateFunction,
): string {
  switch (dimension) {
    case UsageLeaderboardDimension.Provider:
      return row.providerLabel ?? row.label;
    case UsageLeaderboardDimension.Workflow:
      return workflowLabel(row.key, t);
    case UsageLeaderboardDimension.User:
      return userDisplayName({ email: row.email, username: row.username, userId: row.userId });
    case UsageLeaderboardDimension.Model:
      return row.label;
  }
}

export function countsToBars(items: CountByKey[]): BarDatum[] {
  return items.map((item) => ({ key: item.key, label: item.label, value: item.count }));
}
