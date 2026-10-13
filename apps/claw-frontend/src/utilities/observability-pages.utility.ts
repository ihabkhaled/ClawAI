import type {
  AdminObsActivityBucket,
  AdminObsCostKind,
  AdminObsEntityRow,
  AdminObsKpiDelta,
  AdminObsSeriesPoint,
  AdminObsSignupPoint,
  AdminObsGrain,
} from '@claw/shared-types';

import { MICRO_USD_PER_USD } from '@/constants/model-cost.constants';
import {
  COST_KINDS,
  HOURS,
  NO_PLAN_FILTER,
  PERCENT,
  ROLE_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  WEEKDAYS,
} from '@/constants/observability-pages.constants';
import { ROUTES } from '@/constants/routes.constants';
import { ObservabilityChangeDirection } from '@/enums/observability-change-direction.enum';
import { ObservabilityDetailKind } from '@/enums/observability-detail-kind.enum';
import type { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { ChartPoint, ChartSeries, TracingRow } from '@/types/observability-explorer.types';
import {
  formatCount,
  formatUsd,
  microToNumber,
  userDisplayName,
  workflowLabel,
} from '@/utilities/observability-explorer.utility';
import { withQuery } from '@/utilities/observability-url.utility';
import { formatBucketLabel } from '@/utilities/usage-analytics.utility';

/** The wire cost kind as the enum the shared cost badge takes. */
export function toCostKind(kind: AdminObsCostKind): UsageCostKind {
  return COST_KINDS[kind];
}

/** A chart value in USD (a plain number, for axis and tooltip text) as `$1.2345`. */
export function formatChartUsd(value: number): string {
  return formatUsd(String(Math.round(value * MICRO_USD_PER_USD)));
}

/** `12.3%` from a 0..100 number; `-` when the server could not compute it. */
export function formatPercent(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`;
}

/** `12.3%` from a 0..1 ratio. */
export function formatRatioPercent(value: number | null): string {
  return value === null ? '-' : formatPercent(value * PERCENT);
}

/** A whole count, or `-` when the server could not compute it (never a made-up 0). */
export function formatOptionalCount(value: number | null): string {
  return value === null ? '-' : formatCount(value);
}

/** The "View all" link text: with the total once it is known, without it while loading. */
export function viewAllText(label: string, total: number | null): string {
  return total === null ? label : `${label} (${formatCount(total)})`;
}

/** An account role in the reader's language; an unknown role stays as the server sent it. */
export function roleLabel(role: string | null, t: TranslateFunction): string {
  if (role === null) {
    return '-';
  }
  const key = ROLE_LABEL_KEYS[role];
  return key === undefined ? role : t(key);
}

/** An account status in the reader's language; an unknown status stays as the server sent it. */
export function statusLabel(status: string | null, t: TranslateFunction): string {
  if (status === null) {
    return '-';
  }
  const key = STATUS_LABEL_KEYS[status];
  return key === undefined ? status : t(key);
}

/**
 * What a detail page still needs the operator to choose: a provider page with no
 * provider, or a model page missing the provider or the model. `null` when the
 * link names everything the page needs.
 */
export function missingDetailTarget(
  provider: string,
  model: string | null,
): ObservabilityDetailKind | null {
  if (model === null) {
    return provider === '' ? ObservabilityDetailKind.Provider : null;
  }
  return provider === '' || model === '' ? ObservabilityDetailKind.Model : null;
}

/** A per-request count with one decimal, `-` when undefined. */
export function formatDecimal(value: number | null): string {
  return value === null ? '-' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Whole seconds or milliseconds for a settle time. */
export function formatSettle(ms: number | null): string {
  if (ms === null) {
    return '-';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** The text that names a row in its own list. */
export function entityName(row: AdminObsEntityRow, t: TranslateFunction): string {
  switch (row.kind) {
    case 'USER':
      return (
        row.email ??
        row.maskedEmail ??
        userDisplayName({ email: null, username: row.username, userId: row.userId })
      );
    case 'PLAN':
      return row.key === NO_PLAN_FILTER
        ? t('observabilityPages.noPlan')
        : (row.planName ?? row.label);
    case 'WORKFLOW':
      return workflowLabel(row.key, t);
    case 'PROVIDER':
      return row.providerLabel ?? row.label;
    case 'MODEL':
      return row.model ?? row.label;
  }
}

/** Provider and model ids go in the query string, so a "/" or ":" in a model id is safe. */
export function modelDetailHref(provider: string, model: string, sharedQuery: string): string {
  const params = new URLSearchParams(sharedQuery);
  params.set('provider', provider);
  params.set('model', model);
  return withQuery(ROUTES.OBSERVABILITY_MODEL_DETAIL, params.toString());
}

export function providerDetailHref(provider: string, sharedQuery: string): string {
  const params = new URLSearchParams(sharedQuery);
  params.delete('provider');
  params.delete('model');
  return withQuery(ROUTES.OBSERVABILITY_PROVIDER_DETAIL(provider), params.toString());
}

/** The users page narrowed to one provider, model or plan, keeping the period. */
export function usersHref(
  sharedQuery: string,
  filter: Partial<Record<'provider' | 'model' | 'plan' | 'workflow', string>>,
): string {
  const params = new URLSearchParams(sharedQuery);
  for (const [key, value] of Object.entries(filter)) {
    params.set(key, value);
  }
  return withQuery(ROUTES.OBSERVABILITY_USERS, params.toString());
}

/**
 * Whether an audit tracing row is the provider itself (`model` null), or exactly
 * that model of that provider. The match is on provider AND model id, because
 * model ids repeat across providers.
 */
export function isTracingRowOf(row: TracingRow, provider: string, model: string | null): boolean {
  const sameProvider = row.provider?.toLowerCase() === provider.toLowerCase();
  if (model === null) {
    return sameProvider;
  }
  return sameProvider && row.model?.toLowerCase() === model.toLowerCase();
}

/** The provider code a row belongs to, for the detail link. */
export function rowProviderKey(row: AdminObsEntityRow): string {
  return row.provider ?? row.key;
}

export function bucketLabels(series: AdminObsSeriesPoint[], grain: AdminObsGrain): string[] {
  return series.map((point) => formatBucketLabel(point.bucketStart, grain));
}

export function requestPoints(series: AdminObsSeriesPoint[], grain: AdminObsGrain): ChartPoint[] {
  return series.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: point.requests,
  }));
}

export function costPoints(series: AdminObsSeriesPoint[], grain: AdminObsGrain): ChartPoint[] {
  return series.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: microToNumber(point.costMicroUsd),
  }));
}

export function activeUserPoints(
  series: AdminObsSeriesPoint[],
  grain: AdminObsGrain,
): ChartPoint[] {
  return series.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: point.activeUsers,
  }));
}

export function signupPoints(series: AdminObsSignupPoint[], grain: AdminObsGrain): ChartPoint[] {
  return series.map((point) => ({
    label: formatBucketLabel(point.bucketStart, grain),
    value: point.count,
  }));
}

/** Input and output tokens per bucket as stacked series. */
export function tokenSeries(
  series: AdminObsSeriesPoint[],
  names: { input: string; output: string },
): ChartSeries[] {
  return [
    { key: 'input', label: names.input, colorIndex: 0, values: series.map((p) => p.inputTokens) },
    {
      key: 'output',
      label: names.output,
      colorIndex: 1,
      values: series.map((p) => p.outputTokens),
    },
  ];
}

/** All 24 hours (UTC), zero-filled, so a quiet hour is a visible gap and not a missing bar. */
export function hourOfDaySeries(buckets: AdminObsActivityBucket[]): {
  labels: string[];
  values: number[];
} {
  const values = Array.from({ length: HOURS }, () => 0);
  for (const bucket of buckets) {
    if (bucket.bucket >= 0 && bucket.bucket < HOURS) {
      values[bucket.bucket] = bucket.requests;
    }
  }
  return { labels: values.map((_, hour) => String(hour).padStart(2, '0')), values };
}

/** Monday to Sunday (ISO weekday 1-7), zero-filled; `names` are the translated weekday names. */
export function dayOfWeekSeries(
  buckets: AdminObsActivityBucket[],
  names: readonly string[],
): {
  labels: string[];
  values: number[];
} {
  const values = Array.from({ length: WEEKDAYS }, () => 0);
  for (const bucket of buckets) {
    if (bucket.bucket >= 1 && bucket.bucket <= WEEKDAYS) {
      values[bucket.bucket - 1] = bucket.requests;
    }
  }
  return { labels: [...names], values };
}

/** `+12.5%` / `-3.0%`, or `-` when the previous period was zero. */
export function formatChange(delta: AdminObsKpiDelta): string {
  if (delta.changePct === null) {
    return '-';
  }
  const sign = delta.changePct > 0 ? '+' : '';
  return `${sign}${delta.changePct.toFixed(1)}%`;
}

/** The direction of a change, for an icon and a screen-reader word, never colour alone. */
export function changeDirection(delta: AdminObsKpiDelta): ObservabilityChangeDirection {
  if (delta.changePct === null || delta.changePct === 0) {
    return ObservabilityChangeDirection.Flat;
  }
  return delta.changePct > 0 ? ObservabilityChangeDirection.Up : ObservabilityChangeDirection.Down;
}

/** A KPI count from its integer string, grouped for reading. */
export function formatKpiCount(value: string): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? formatCount(parsed) : value;
}
