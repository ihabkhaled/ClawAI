import { describe, expect, it } from 'vitest';

import { tStub as t } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import {
  modelObsRow,
  obsRow,
  userObsRow,
} from '@/components/observability/pages/__tests__/pages-fixtures';
import { ObservabilityChangeDirection } from '@/enums/observability-change-direction.enum';
import { ObservabilityDetailKind } from '@/enums/observability-detail-kind.enum';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type { TracingRow } from '@/types/observability-explorer.types';
import {
  changeDirection,
  costPoints,
  dayOfWeekSeries,
  entityName,
  formatChange,
  formatDecimal,
  formatKpiCount,
  formatOptionalCount,
  formatPercent,
  formatRatioPercent,
  formatSettle,
  hourOfDaySeries,
  isTracingRowOf,
  missingDetailTarget,
  modelDetailHref,
  providerDetailHref,
  requestPoints,
  roleLabel,
  signupPoints,
  statusLabel,
  toCostKind,
  usersHref,
  viewAllText,
} from '@/utilities/observability-pages.utility';

describe('formatters', () => {
  it('prints a dash where the server could not compute a value', () => {
    expect(formatPercent(null)).toBe('-');
    expect(formatRatioPercent(null)).toBe('-');
    expect(formatDecimal(null)).toBe('-');
    expect(formatSettle(null)).toBe('-');
  });

  it('prints percentages, ratios and settle times', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatRatioPercent(0.5)).toBe('50.0%');
    expect(formatSettle(840)).toBe('840 ms');
    expect(formatSettle(4200)).toBe('4.2 s');
    expect(formatKpiCount('1234567')).toBe((1234567).toLocaleString());
    expect(formatKpiCount('n/a')).toBe('n/a');
  });
});

describe('change against the previous period', () => {
  it('signs a rise and a fall, and shows a dash when the previous period was zero', () => {
    expect(formatChange({ current: '12', previous: '10', changePct: 20 })).toBe('+20.0%');
    expect(formatChange({ current: '8', previous: '10', changePct: -20 })).toBe('-20.0%');
    expect(formatChange({ current: '5', previous: '0', changePct: null })).toBe('-');
  });

  it('names the direction', () => {
    expect(changeDirection({ current: '1', previous: '0', changePct: 5 })).toBe('up');
    expect(changeDirection({ current: '1', previous: '0', changePct: -5 })).toBe('down');
    expect(changeDirection({ current: '1', previous: '0', changePct: 0 })).toBe('flat');
    expect(changeDirection({ current: '1', previous: '0', changePct: null })).toBe('flat');
  });
});

describe('entityName', () => {
  it('shows the full email for a user, then the masked one, then the username', () => {
    expect(entityName(userObsRow(), t)).toBe('jane.doe@example.com');
    expect(entityName(userObsRow({ email: null, maskedEmail: 'ja***@x.com' }), t)).toBe(
      'ja***@x.com',
    );
    expect(entityName(userObsRow({ email: null, maskedEmail: null }), t)).toBe('jane');
  });

  it('names a provider by its label, a model by its id, a plan by its name', () => {
    expect(entityName(obsRow(), t)).toBe('Gemini');
    expect(entityName(modelObsRow(), t)).toBe('ft:gpt-4o/mini');
    expect(entityName(obsRow({ kind: 'PLAN', key: 'p-1', planName: 'Pro' }), t)).toBe('Pro');
  });

  it('localises the no-plan group and an unknown workflow', () => {
    expect(entityName(obsRow({ kind: 'PLAN', key: 'NONE' }), t)).toBe('observabilityPages.noPlan');
    expect(entityName(obsRow({ kind: 'WORKFLOW', key: 'UNKNOWN' }), t)).toBe(
      'observabilityExplorer.workflowUnknown',
    );
    expect(entityName(obsRow({ kind: 'WORKFLOW', key: 'CHAT' }), t)).toBe('CHAT');
  });
});

describe('links', () => {
  it('puts the model in the query string, encoded, over the provider filter already set', () => {
    expect(modelDetailHref('OPENAI', 'ft:gpt-4o/mini', 'period=30d&provider=GEMINI')).toBe(
      '/observability/models/detail?period=30d&provider=OPENAI&model=ft%3Agpt-4o%2Fmini',
    );
  });

  it('puts the provider in the path and drops the provider and model filters', () => {
    expect(providerDetailHref('LOCAL_OLLAMA', 'period=30d&provider=GEMINI&model=m')).toBe(
      '/observability/providers/LOCAL_OLLAMA?period=30d',
    );
  });

  it('opens the users page narrowed to one group, keeping the period', () => {
    expect(usersHref('period=7d', { plan: 'NONE' })).toBe(
      '/observability/users?period=7d&plan=NONE',
    );
    expect(usersHref('', { provider: 'GEMINI', model: 'm' })).toBe(
      '/observability/users?provider=GEMINI&model=m',
    );
  });
});

describe('chart series', () => {
  const series = [
    {
      bucketStart: '2026-10-05T00:00:00.000Z',
      requests: 5,
      inputTokens: 1,
      outputTokens: 2,
      weightedTokens: 3,
      toolCalls: 0,
      costMicroUsd: '2000000',
      activeUsers: 2,
    },
  ];

  it('labels each bucket by its grain', () => {
    expect(requestPoints(series, 'DAY')).toEqual([{ label: '10-05', value: 5 }]);
    expect(requestPoints(series, 'HOUR')).toEqual([{ label: '10-05 00:00', value: 5 }]);
    expect(costPoints(series, 'DAY')).toEqual([{ label: '10-05', value: 2 }]);
    expect(signupPoints([{ bucketStart: '2026-10-05T00:00:00.000Z', count: 3 }], 'DAY')).toEqual([
      { label: '10-05', value: 3 },
    ]);
  });

  it('fills all 24 hours so a quiet hour is a gap, not a missing bar', () => {
    const result = hourOfDaySeries([{ bucket: 9, requests: 6, costMicroUsd: '0' }]);
    expect(result.labels).toHaveLength(24);
    expect(result.labels[9]).toBe('09');
    expect(result.values[9]).toBe(6);
    expect(result.values.filter((value) => value === 0)).toHaveLength(23);
  });

  it('fills Monday to Sunday and ignores an out-of-range bucket', () => {
    const names = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const result = dayOfWeekSeries(
      [
        { bucket: 1, requests: 4, costMicroUsd: '0' },
        { bucket: 7, requests: 2, costMicroUsd: '0' },
        { bucket: 9, requests: 99, costMicroUsd: '0' },
      ],
      names,
    );
    expect(result.labels).toEqual(names);
    expect(result.values).toEqual([4, 0, 0, 0, 0, 0, 2]);
  });
});

describe('toCostKind', () => {
  it('maps the wire value to the enum the cost badge takes', () => {
    expect(toCostKind('PRICED')).toBe(UsageCostKind.Priced);
    expect(toCostKind('FALLBACK')).toBe(UsageCostKind.Fallback);
    expect(toCostKind('UNPRICED')).toBe(UsageCostKind.Unpriced);
    expect(toCostKind('UNMETERED')).toBe(UsageCostKind.Unmetered);
  });
});

describe('change direction enum', () => {
  it('returns the enum members', () => {
    expect(changeDirection({ current: '1', previous: '0', changePct: 5 })).toBe(
      ObservabilityChangeDirection.Up,
    );
    expect(changeDirection({ current: '1', previous: '2', changePct: -5 })).toBe(
      ObservabilityChangeDirection.Down,
    );
    expect(changeDirection({ current: '1', previous: '1', changePct: null })).toBe(
      ObservabilityChangeDirection.Flat,
    );
  });
});

describe('formatOptionalCount and viewAllText', () => {
  it('prints a dash for an unknown count, never 0', () => {
    expect(formatOptionalCount(null)).toBe('-');
    expect(formatOptionalCount(0)).toBe('0');
    expect(formatOptionalCount(1204)).toBe((1204).toLocaleString());
  });

  it('adds the total to "View all" only once it is known', () => {
    expect(viewAllText('View all', null)).toBe('View all');
    expect(viewAllText('View all', 0)).toBe('View all (0)');
    expect(viewAllText('View all', 8)).toBe('View all (8)');
  });
});

describe('roleLabel and statusLabel', () => {
  it('translates known values', () => {
    expect(roleLabel('ADMIN', t)).toBe('admin.roleAdmin');
    expect(roleLabel('USER', t)).toBe('admin.roleUser');
    expect(roleLabel('OPERATOR', t)).toBe('admin.roleOperator');
    expect(roleLabel('VIEWER', t)).toBe('admin.roleViewer');
    expect(statusLabel('ACTIVE', t)).toBe('observabilityPages.statusActive');
    expect(statusLabel('SUSPENDED', t)).toBe('observabilityPages.statusSuspended');
    expect(statusLabel('PENDING', t)).toBe('observabilityPages.statusPending');
  });

  it('keeps an unknown value as sent, and a dash for none', () => {
    expect(roleLabel('AUDITOR', t)).toBe('AUDITOR');
    expect(statusLabel('ARCHIVED', t)).toBe('ARCHIVED');
    expect(roleLabel(null, t)).toBe('-');
    expect(statusLabel(null, t)).toBe('-');
  });
});

describe('missingDetailTarget', () => {
  it('needs a provider on a provider page', () => {
    expect(missingDetailTarget('', null)).toBe(ObservabilityDetailKind.Provider);
    expect(missingDetailTarget('GEMINI', null)).toBeNull();
  });

  it('needs a provider and a model on a model page', () => {
    expect(missingDetailTarget('', '')).toBe(ObservabilityDetailKind.Model);
    expect(missingDetailTarget('OPENAI', '')).toBe(ObservabilityDetailKind.Model);
    expect(missingDetailTarget('', 'gpt-x')).toBe(ObservabilityDetailKind.Model);
    expect(missingDetailTarget('OPENAI', 'gpt-x')).toBeNull();
  });
});

describe('isTracingRowOf', () => {
  const row = (provider: string | null, model: string | null): TracingRow => ({
    key: 'k',
    label: 'l',
    provider,
    model,
    requests: 1,
    measuredRequests: 1,
    avgLatencyMs: 1,
    p50LatencyMs: 1,
    p95LatencyMs: 1,
    totalTokens: 1,
    providerReportedRequests: 1,
    estimatedRequests: 0,
    failureEvents: 0,
    errorRate: 0,
  });

  it('matches a provider by code, ignoring case', () => {
    expect(isTracingRowOf(row('gemini', null), 'GEMINI', null)).toBe(true);
    expect(isTracingRowOf(row('OPENAI', null), 'GEMINI', null)).toBe(false);
    expect(isTracingRowOf(row(null, null), 'GEMINI', null)).toBe(false);
  });

  it('matches a model only under its own provider', () => {
    expect(isTracingRowOf(row('GEMINI', 'm'), 'GEMINI', 'm')).toBe(true);
    expect(isTracingRowOf(row('OPENAI', 'm'), 'GEMINI', 'm')).toBe(false);
    expect(isTracingRowOf(row('GEMINI', 'other'), 'GEMINI', 'm')).toBe(false);
    expect(isTracingRowOf(row('GEMINI', null), 'GEMINI', 'm')).toBe(false);
  });
});
