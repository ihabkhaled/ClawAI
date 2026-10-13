import type {
  AdminObsDerived,
  AdminObsDetail,
  AdminObsEntityRow,
  AdminObsHealth,
  AdminObsKpiDelta,
  AdminObsMetrics,
  AdminObsOverview,
  AdminObsPage,
  AdminObsSeriesPoint,
} from '@claw/shared-types';
import { vi } from 'vitest';

import { NO_PAGE_FILTER_OPTIONS } from '@/constants/observability-pages.constants';
import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';
import { buildScope, parseUrlState } from '@/utilities/observability-url.utility';
import { validateSelection } from '@/utilities/usage-analytics.utility';

export function obsMetrics(overrides: Partial<AdminObsMetrics> = {}): AdminObsMetrics {
  return {
    requests: 12,
    inputTokens: 1000,
    outputTokens: 500,
    cachedTokens: 100,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    weightedTokens: 1500,
    toolCalls: 3,
    cost: {
      costMicroUsd: '2500000',
      actualMicroUsd: '2500000',
      estimatedMicroUsd: '0',
      costKind: 'PRICED',
      pricedRequests: 12,
      estimatedRequests: 0,
      unpricedRequests: 0,
      unmeteredRequests: 0,
      partial: false,
    },
    creditRequests: 2,
    allowanceRequests: 4,
    creditSpendMicroUsd: '500000',
    allowanceCostMicroUsd: '100000',
    firstSeenAt: '2026-10-01T08:00:00.000Z',
    lastSeenAt: '2026-10-05T11:30:00.000Z',
    activeDays: 4,
    distinctUsers: 3,
    distinctModels: 2,
    ...overrides,
  };
}

export function obsDerived(overrides: Partial<AdminObsDerived> = {}): AdminObsDerived {
  return {
    costPerRequestMicroUsd: '208333',
    costPer1kTokensMicroUsd: '1666666',
    avgInputTokens: 83,
    avgOutputTokens: 42,
    toolCallsPerRequest: 0.25,
    cacheHitRate: 0.0833,
    reasoningShare: 0,
    shareOfCostPct: 40,
    shareOfRequestsPct: 25,
    estimateAccuracy: 0.98,
    ...overrides,
  };
}

export function obsHealth(overrides: Partial<AdminObsHealth> = {}): AdminObsHealth {
  return {
    finalized: 90,
    released: 10,
    inFlight: 2,
    staleReserved: 1,
    settleRate: 0.9,
    refundRate: 0.1,
    avgSettleMs: 1200,
    p50SettleMs: 900,
    p95SettleMs: 4200,
    ...overrides,
  };
}

export function obsRow(overrides: Partial<AdminObsEntityRow> = {}): AdminObsEntityRow {
  return {
    key: 'GEMINI',
    label: 'GEMINI',
    kind: 'PROVIDER',
    userId: null,
    email: null,
    maskedEmail: null,
    username: null,
    role: null,
    status: null,
    signedUpAt: null,
    provider: 'GEMINI',
    providerLabel: 'Gemini',
    model: null,
    planId: null,
    planName: null,
    metrics: obsMetrics(),
    derived: obsDerived(),
    health: obsHealth(),
    ...overrides,
  };
}

export const FULL_EMAIL = 'jane.doe@example.com';

export function userObsRow(overrides: Partial<AdminObsEntityRow> = {}): AdminObsEntityRow {
  return obsRow({
    key: 'user-1',
    label: FULL_EMAIL,
    kind: 'USER',
    userId: 'user-1',
    email: FULL_EMAIL,
    username: 'jane',
    role: 'USER',
    status: 'ACTIVE',
    signedUpAt: '2026-09-01T00:00:00.000Z',
    provider: null,
    providerLabel: null,
    planId: 'plan-pro',
    planName: 'Pro',
    ...overrides,
  });
}

export function modelObsRow(overrides: Partial<AdminObsEntityRow> = {}): AdminObsEntityRow {
  return obsRow({
    key: 'OPENAI/ft:gpt-4o/mini',
    label: 'ft:gpt-4o/mini',
    kind: 'MODEL',
    provider: 'OPENAI',
    providerLabel: 'OpenAI',
    model: 'ft:gpt-4o/mini',
    ...overrides,
  });
}

export function obsPage(
  items: AdminObsEntityRow[],
  overrides: Partial<AdminObsPage> = {},
): AdminObsPage {
  return {
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-08T00:00:00.000Z',
    generatedAt: '2026-10-08T00:00:00.000Z',
    grain: 'DAY',
    sort: 'cost',
    order: 'desc',
    page: 1,
    limit: 20,
    total: items.length,
    pageCount: 1,
    items,
    totals: { metrics: obsMetrics(), derived: obsDerived() },
    ...overrides,
  };
}

function delta(current: string, previous: string, changePct: number | null): AdminObsKpiDelta {
  return { current, previous, changePct };
}

export function obsSeries(): AdminObsSeriesPoint[] {
  return [
    {
      bucketStart: '2026-10-05T00:00:00.000Z',
      requests: 5,
      inputTokens: 500,
      outputTokens: 200,
      weightedTokens: 700,
      toolCalls: 1,
      costMicroUsd: '1000000',
      activeUsers: 2,
    },
    {
      bucketStart: '2026-10-06T00:00:00.000Z',
      requests: 7,
      inputTokens: 500,
      outputTokens: 300,
      weightedTokens: 800,
      toolCalls: 2,
      costMicroUsd: '1500000',
      activeUsers: 3,
    },
  ];
}

export function obsOverview(overrides: Partial<AdminObsOverview> = {}): AdminObsOverview {
  return {
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-08T00:00:00.000Z',
    generatedAt: '2026-10-08T00:00:00.000Z',
    grain: 'DAY',
    previousFrom: '2026-09-24T00:00:00.000Z',
    previousTo: '2026-10-01T00:00:00.000Z',
    totals: { metrics: obsMetrics(), derived: obsDerived() },
    previousTotals: { metrics: obsMetrics({ requests: 10 }), derived: obsDerived() },
    deltas: {
      requests: delta('12', '10', 20),
      costMicroUsd: delta('2500000', '2600000', -3.85),
      tokens: delta('1500', '1500', 0),
      toolCalls: delta('3', '0', null),
      activeUsers: delta('3', '2', 50),
    },
    activeUsers: 3,
    firstTimeUsers: 1,
    newSignups: 4,
    signupsSeries: [{ bucketStart: '2026-10-05T00:00:00.000Z', count: 2 }],
    counts: { providers: 3, models: 8, plans: 2, workflows: 4 },
    health: obsHealth(),
    series: obsSeries(),
    hourOfDay: [{ bucket: 9, requests: 6, costMicroUsd: '1000000' }],
    dayOfWeek: [{ bucket: 1, requests: 4, costMicroUsd: '500000' }],
    billingSplit: [
      { billing: 'CREDIT', requests: 2, costMicroUsd: '500000' },
      { billing: 'ALLOWANCE', requests: 4, costMicroUsd: '100000' },
    ],
    ...overrides,
  };
}

export function obsDetail(overrides: Partial<AdminObsDetail> = {}): AdminObsDetail {
  return {
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-08T00:00:00.000Z',
    generatedAt: '2026-10-08T00:00:00.000Z',
    grain: 'DAY',
    entity: obsRow(),
    series: obsSeries(),
    hourOfDay: [{ bucket: 9, requests: 6, costMicroUsd: '1000000' }],
    billingSplit: [{ billing: 'CREDIT', requests: 2, costMicroUsd: '500000' }],
    models: [modelObsRow()],
    providers: [],
    users: [userObsRow()],
    plans: [obsRow({ key: 'plan-pro', kind: 'PLAN', planId: 'plan-pro', planName: 'Pro' })],
    workflows: [obsRow({ key: 'CHAT', label: 'CHAT', kind: 'WORKFLOW' })],
    truncated: false,
    ...overrides,
  };
}

/** A context value for components that read `useObservabilityScope`, with spies for every writer. */
export function scopeContext(
  query = 'period=7d',
  overrides: Partial<ObservabilityPagesContextValue> = {},
): ObservabilityPagesContextValue {
  const params = new URLSearchParams(query);
  const state = parseUrlState(params);
  const scope = buildScope(state, new Date('2026-10-08T12:00:00.000Z'));
  return {
    state,
    scope,
    options: NO_PAGE_FILTER_OPTIONS,
    issue: validateSelection(scope.selection),
    sharedQuery: query,
    setParams: vi.fn(),
    setPeriod: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    openUser: vi.fn(),
    closeUser: vi.fn(),
    param: (name: string) => params.get(name) ?? '',
    ...overrides,
  };
}

export const DEFAULT_PERIOD = ObservabilityPeriod.Last7Days;
