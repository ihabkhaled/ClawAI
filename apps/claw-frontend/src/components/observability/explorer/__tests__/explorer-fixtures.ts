import { vi } from 'vitest';

import { UsageBillingKind } from '@/enums/usage-billing-kind.enum';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type {
  AdminUsageGroupRow,
  AdminUsageMetrics,
  AdminUsageRequestRow,
  AdminUsageUserRow,
  AdminUserConsumptionDetail,
  ObservabilityScope,
  UseObservabilityFiltersReturn,
} from '@/types/observability-explorer.types';

export const FULL_EMAIL = 'jane.doe@example.com';

export function metrics(overrides: Partial<AdminUsageMetrics> = {}): AdminUsageMetrics {
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
      costKind: UsageCostKind.Priced,
      pricedRequests: 12,
      estimatedRequests: 0,
      unpricedRequests: 0,
      unmeteredRequests: 0,
      partial: false,
    },
    creditRequests: 2,
    allowanceRequests: 4,
    creditSpendMicroUsd: '500000',
    lastSeenAt: '2026-10-05T11:30:00.000Z',
    ...overrides,
  };
}

export function userRow(overrides: Partial<AdminUsageUserRow> = {}): AdminUsageUserRow {
  return {
    ...metrics(),
    userId: 'user-1',
    email: FULL_EMAIL,
    username: 'jane',
    role: 'USER',
    ...overrides,
  };
}

export function groupRow(overrides: Partial<AdminUsageGroupRow> = {}): AdminUsageGroupRow {
  return {
    ...metrics(),
    key: 'GEMINI',
    label: 'GEMINI',
    provider: 'GEMINI',
    providerLabel: 'Gemini',
    model: null,
    userId: null,
    email: null,
    username: null,
    ...overrides,
  };
}

export function requestRow(overrides: Partial<AdminUsageRequestRow> = {}): AdminUsageRequestRow {
  return {
    id: 'req-1',
    at: '2026-10-05T11:00:00.000Z',
    provider: 'GEMINI',
    providerLabel: 'Gemini',
    model: 'gemini-x',
    workflow: 'CHAT',
    status: 'FINALIZED',
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    weightedTokens: 150,
    toolCalls: 0,
    costMicroUsd: '1000',
    costKind: UsageCostKind.Priced,
    billing: UsageBillingKind.Credit,
    ...overrides,
  };
}

export function detail(
  overrides: Partial<AdminUserConsumptionDetail> = {},
): AdminUserConsumptionDetail {
  return {
    user: {
      userId: 'user-1',
      email: FULL_EMAIL,
      username: 'jane',
      role: 'USER',
      status: 'ACTIVE',
    },
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-08T00:00:00.000Z',
    generatedAt: '2026-10-08T00:00:00.000Z',
    grain: 'DAY',
    filters: { provider: null, model: null, workflow: null, billing: null },
    totals: metrics(),
    models: [groupRow({ key: 'gemini-x', label: 'gemini-x', model: 'gemini-x' })],
    providers: [groupRow()],
    workflows: [
      groupRow({ key: 'UNKNOWN', label: 'UNKNOWN', provider: null, providerLabel: null }),
    ],
    breakdownTruncated: false,
    series: [
      { ...metrics(), bucketStart: '2026-10-05T00:00:00.000Z' },
      { ...metrics({ requests: 4 }), bucketStart: '2026-10-06T00:00:00.000Z' },
    ],
    heaviestRequests: [requestRow()],
    filterOptions: {
      providers: [{ value: 'GEMINI', label: 'Gemini' }],
      models: ['gemini-x'],
      workflows: ['CHAT', 'UNKNOWN'],
    },
    ...overrides,
  };
}

export function scope(overrides: Partial<ObservabilityScope> = {}): ObservabilityScope {
  return {
    selection: { preset: UsageRangePreset.Week, hours: 24, customFrom: '', customTo: '' },
    filters: { provider: '', model: '', workflow: '', billing: '' },
    buildParams: () => ({ hours: '168' }),
    buildRangeParams: () => ({ hours: '168' }),
    buildHours: (maxHours: number) => ({ hours: Math.min(168, maxHours), clamped: false }),
    ...overrides,
  };
}

/** Translate stub: the key, with any params appended so placeholders can be asserted. */
export function tStub(key: string, params?: Record<string, string | number>): string {
  return params === undefined
    ? key
    : `${key}|${Object.entries(params)
        .map(([name, value]) => `${name}=${String(value)}`)
        .join(',')}`;
}

export function filtersState(
  overrides: Partial<UseObservabilityFiltersReturn> = {},
): UseObservabilityFiltersReturn {
  return {
    draft: { preset: UsageRangePreset.Week, hours: 24, customFrom: '', customTo: '' },
    filters: { provider: '', model: '', workflow: '', billing: '' },
    issue: null,
    scope: scope(),
    setPreset: vi.fn(),
    setHours: vi.fn(),
    setCustomFrom: vi.fn(),
    setCustomTo: vi.fn(),
    setFilter: vi.fn(),
    apply: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  };
}
