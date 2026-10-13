import {
  BILLING_KINDS,
  DATE_ONLY,
  DEFAULT_OBSERVABILITY_PERIOD,
  EMPTY_OBSERVABILITY_URL_STATE,
  MAX_PARAM_LENGTH,
  PAGE_URL_KEYS,
  PERIODS,
  ROLLING_DAYS,
  SHARED_URL_KEYS,
} from '@/constants/observability-pages.constants';
import { ROUTES } from '@/constants/routes.constants';
import { MS_PER_DAY, USAGE_MAX_RANGE_DAYS } from '@/constants/usage-analytics.constants';
import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageRangeSelection } from '@/types/admin-usage-analytics.types';
import type {
  ExplorerFilters,
  ExplorerParams,
  ObservabilityScope,
  SortOrder,
} from '@/types/observability-explorer.types';
import type {
  ObservabilityUrlState,
  SearchParamsReader,
  UrlUpdates,
} from '@/types/observability-pages.types';
import { selectionToHours } from '@/utilities/observability-explorer.utility';
import { buildRangeQuery, validateSelection } from '@/utilities/usage-analytics.utility';

function readText(params: SearchParamsReader, name: string): string {
  return (params.get(name) ?? '').trim().slice(0, MAX_PARAM_LENGTH);
}

/** The URL as typed state. Anything unrecognised falls back to the default, never throws. */
export function parseUrlState(params: SearchParamsReader): ObservabilityUrlState {
  const periodText = readText(params, 'period');
  const period = PERIODS.includes(periodText)
    ? (periodText as ObservabilityPeriod)
    : DEFAULT_OBSERVABILITY_PERIOD;
  const from = readText(params, 'from');
  const to = readText(params, 'to');
  const billing = readText(params, 'billing');
  return {
    ...EMPTY_OBSERVABILITY_URL_STATE,
    period,
    from: DATE_ONLY.test(from) ? from : '',
    to: DATE_ONLY.test(to) ? to : '',
    provider: readText(params, 'provider'),
    model: readText(params, 'model'),
    plan: readText(params, 'plan'),
    workflow: readText(params, 'workflow'),
    billing: BILLING_KINDS.includes(billing) ? billing : '',
    user: readText(params, 'user'),
  };
}

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The URL period as the selection shape the per-user dialog and the audit-backed
 * tabs already understand. 90 days is an inclusive custom range ending today.
 */
export function stateToSelection(state: ObservabilityUrlState, now: Date): UsageRangeSelection {
  const base = { hours: 24, customFrom: '', customTo: '' };
  switch (state.period) {
    case ObservabilityPeriod.Today:
      return { ...base, preset: UsageRangePreset.Today };
    case ObservabilityPeriod.Last24Hours:
      return { ...base, preset: UsageRangePreset.Hours };
    case ObservabilityPeriod.Last7Days:
      return { ...base, preset: UsageRangePreset.Week };
    case ObservabilityPeriod.Last30Days:
      return { ...base, preset: UsageRangePreset.Month };
    case ObservabilityPeriod.Last90Days:
      return {
        ...base,
        preset: UsageRangePreset.Custom,
        customFrom: utcDate(now.getTime() - (USAGE_MAX_RANGE_DAYS - 1) * MS_PER_DAY),
        customTo: utcDate(now.getTime()),
      };
    case ObservabilityPeriod.Custom:
      return {
        ...base,
        preset: UsageRangePreset.Custom,
        customFrom: state.from,
        customTo: state.to,
      };
  }
}

/**
 * The server range query for the URL period. Rolling periods use `hours` / `days`
 * (the server clamps to ITS clock), never a client-computed `from`, so a fast
 * client clock cannot produce a window wider than the server allows.
 */
export function buildPeriodParams(state: ObservabilityUrlState, now: Date): ExplorerParams {
  if (state.period === ObservabilityPeriod.Last24Hours) {
    return { hours: '24' };
  }
  const days = ROLLING_DAYS[state.period];
  if (days !== undefined) {
    return { days: String(days) };
  }
  const params: ExplorerParams = {};
  for (const [key, value] of Object.entries(buildRangeQuery(stateToSelection(state, now), now))) {
    if (value !== undefined) {
      params[key] = String(value);
    }
  }
  return params;
}

export function stateToFilters(state: ObservabilityUrlState): ExplorerFilters {
  return {
    provider: state.provider,
    model: state.model,
    workflow: state.workflow,
    billing: state.billing,
    plan: state.plan,
  };
}

function nonEmptyFilters(filters: ExplorerFilters): ExplorerParams {
  const params: ExplorerParams = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params[key] = value;
    }
  }
  return params;
}

/** The shape every existing tab already takes, driven by the URL instead of component state. */
export function buildScope(state: ObservabilityUrlState, now: Date): ObservabilityScope {
  const selection = stateToSelection(state, now);
  const filters = stateToFilters(state);
  return {
    selection,
    filters,
    buildParams: () => ({ ...buildPeriodParams(state, new Date()), ...nonEmptyFilters(filters) }),
    buildRangeParams: () => buildPeriodParams(state, new Date()),
    buildHours: (maxHours: number) => selectionToHours(selection, new Date(), maxHours),
    issue: validateSelection(selection),
  };
}

/** The query string (no `?`) after applying `updates`. A change to the period or a filter resets the page number only. */
export function applyUpdates(
  params: SearchParamsReader,
  updates: UrlUpdates,
  keepPage: boolean,
): string {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  if (!keepPage) {
    for (const key of PAGE_URL_KEYS) {
      if (!(key in updates)) {
        next.delete(key);
      }
    }
  }
  return next.toString();
}

/** Only the keys every page shares, so a link to another page keeps the period and filters. */
export function buildSharedQuery(params: SearchParamsReader): string {
  const next = new URLSearchParams();
  for (const key of SHARED_URL_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') {
      next.set(key, value);
    }
  }
  return next.toString();
}

export function withQuery(href: string, query: string): string {
  return query === '' ? href : `${href}?${query}`;
}

export function readPositiveInt(
  value: string | null,
  fallback: number,
  allowed: readonly number[],
): number {
  if (value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && allowed.includes(parsed) ? parsed : fallback;
}

/** The 1-based page number from `?page=`; anything else is page 1. */
export function readPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function readSortOrder(value: string | null, fallback: SortOrder): SortOrder {
  return value === 'asc' || value === 'desc' ? value : fallback;
}

/** True when any filter (not the period) is set. */
export function hasActiveFilters(state: ObservabilityUrlState): boolean {
  return [state.provider, state.model, state.plan, state.workflow, state.billing].some(
    (value) => value !== '',
  );
}

/** True on a provider's detail page, where the server ignores the provider and model filters. */
export function isProviderDetailPath(pathname: string): boolean {
  return pathname.startsWith(`${ROUTES.OBSERVABILITY_PROVIDERS}/`);
}

/** A path segment, decoded. A malformed escape (`%zz`) stays as typed instead of crashing the page. */
export function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
