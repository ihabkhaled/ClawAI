import { describe, expect, it } from 'vitest';

import {
  groupRow,
  metrics,
  tStub,
} from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import {
  ariaSortValue,
  buildBarData,
  buildBucketLabels,
  buildExplorerParams,
  buildTokenSeries,
  countsToBars,
  formatLatency,
  formatRate,
  formatUsd,
  groupRowLabel,
  nextSort,
  selectionToHours,
  sharePercent,
  userDisplayName,
  workflowLabel,
} from '@/utilities/observability-explorer.utility';

const NOW = new Date('2026-10-05T12:30:00.000Z');
const selection = (preset: UsageRangePreset, extra = {}) => ({
  preset,
  hours: 24,
  customFrom: '',
  customTo: '',
  ...extra,
});
const noFilters = { provider: '', model: '', workflow: '', billing: '' };

describe('formatUsd', () => {
  it('formats integer micro-USD without floating point', () => {
    expect(formatUsd('2500000')).toBe('$2.5000');
    expect(formatUsd('123456789')).toBe('$123.4567');
  });

  it('never shows a tiny non-zero amount as zero', () => {
    expect(formatUsd('5')).toBe('<$0.0001');
    expect(formatUsd('0')).toBe('$0');
  });

  it('treats junk as zero instead of throwing', () => {
    expect(formatUsd('not-a-number')).toBe('$0');
  });
});

describe('selectionToHours', () => {
  it('counts hours since midnight UTC for Today', () => {
    expect(selectionToHours(selection(UsageRangePreset.Today), NOW, 720)).toEqual({
      hours: 13,
      clamped: false,
    });
  });

  it('uses the typed hours, and week and month as fixed windows', () => {
    expect(selectionToHours(selection(UsageRangePreset.Hours, { hours: 6 }), NOW, 720).hours).toBe(
      6,
    );
    expect(selectionToHours(selection(UsageRangePreset.Week), NOW, 720).hours).toBe(168);
    expect(selectionToHours(selection(UsageRangePreset.Month), NOW, 720).hours).toBe(720);
  });

  it('clamps a custom range longer than the endpoint allows and says so', () => {
    const result = selectionToHours(
      selection(UsageRangePreset.Custom, { customFrom: '2026-08-01', customTo: '2026-10-01' }),
      NOW,
      720,
    );
    expect(result).toEqual({ hours: 720, clamped: true });
  });
});

describe('buildExplorerParams', () => {
  it('sends the range and only the filters that are set', () => {
    const params = buildExplorerParams(
      selection(UsageRangePreset.Week),
      { ...noFilters, provider: 'GEMINI', billing: 'CREDIT' },
      NOW,
    );
    expect(params).toEqual({ hours: '168', provider: 'GEMINI', billing: 'CREDIT' });
  });

  it('leaves `to` off a rolling preset so the server clock decides', () => {
    expect(buildExplorerParams(selection(UsageRangePreset.Today), noFilters, NOW)).toEqual({
      from: '2026-10-05T00:00:00.000Z',
    });
  });
});

describe('sorting helpers', () => {
  it('flips the order on the same column and starts descending on a new one', () => {
    expect(nextSort('cost', 'desc', 'cost')).toEqual({ sort: 'cost', order: 'asc' });
    expect(nextSort('cost', 'asc', 'cost')).toEqual({ sort: 'cost', order: 'desc' });
    expect(nextSort('cost', 'asc', 'tokens')).toEqual({ sort: 'tokens', order: 'desc' });
  });

  it('reports aria-sort only for the active column', () => {
    expect(ariaSortValue('cost', 'cost', 'asc')).toBe('ascending');
    expect(ariaSortValue('cost', 'cost', 'desc')).toBe('descending');
    expect(ariaSortValue('tokens', 'cost', 'desc')).toBe('none');
  });
});

describe('labels', () => {
  it('shows the server UNKNOWN workflow as Unknown, never as a real surface', () => {
    expect(workflowLabel('UNKNOWN', tStub)).toBe('observabilityExplorer.workflowUnknown');
    expect(workflowLabel('', tStub)).toBe('observabilityExplorer.workflowUnknown');
    expect(workflowLabel('CHAT', tStub)).toBe('CHAT');
  });

  it('prefers the full email, then username, then id', () => {
    expect(userDisplayName({ email: 'a@b.co', username: 'a', userId: 'u' })).toBe('a@b.co');
    expect(userDisplayName({ email: null, username: 'a', userId: 'u' })).toBe('a');
    expect(userDisplayName({ email: null, username: null, userId: 'u' })).toBe('u');
  });

  it('labels a ranked row per grouping using the normalised provider name', () => {
    const row = groupRow({ providerLabel: 'Local Ollama', label: 'local-ollama', key: 'k' });
    expect(groupRowLabel(row, UsageLeaderboardDimension.Provider, tStub)).toBe('Local Ollama');
    expect(groupRowLabel(row, UsageLeaderboardDimension.Model, tStub)).toBe('local-ollama');
    expect(
      groupRowLabel(
        groupRow({ email: 'full@example.com', userId: 'u' }),
        UsageLeaderboardDimension.User,
        tStub,
      ),
    ).toBe('full@example.com');
    expect(
      groupRowLabel(groupRow({ key: 'UNKNOWN' }), UsageLeaderboardDimension.Workflow, tStub),
    ).toBe('observabilityExplorer.workflowUnknown');
  });
});

describe('formatting', () => {
  it('uses a dash for missing latency and rate', () => {
    expect(formatLatency(null)).toBe('-');
    expect(formatLatency(1234.6)).toContain('1,235');
    expect(formatRate(null)).toBe('-');
    expect(formatRate(0.1234)).toBe('12.3%');
  });

  it('computes whole-percent shares', () => {
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(1, 0)).toBe(0);
  });
});

describe('chart data builders', () => {
  const points = [
    { ...metrics({ inputTokens: 10, outputTokens: 5 }), bucketStart: '2026-10-05T00:00:00.000Z' },
    { ...metrics({ inputTokens: 20, outputTokens: 8 }), bucketStart: '2026-10-06T00:00:00.000Z' },
  ];

  it('labels buckets by day', () => {
    expect(buildBucketLabels(points, 'DAY')).toEqual(['10-05', '10-06']);
  });

  it('builds stacked input and output series', () => {
    const series = buildTokenSeries(points, { input: 'In', output: 'Out' });
    expect(series.map((s) => s.values)).toEqual([
      [10, 20],
      [5, 8],
    ]);
  });

  it('keeps the largest positive bars, capped', () => {
    const rows = [
      groupRow({ key: 'a', label: 'a' }),
      groupRow({ key: 'b', label: 'b' }),
      groupRow({ key: 'c', label: 'c' }),
    ];
    const values: Record<string, number> = { a: 5, b: 0, c: 9 };
    const bars = buildBarData(
      rows,
      (r) => values[r.key] ?? 0,
      (r) => r.label,
      1,
    );
    expect(bars).toEqual([{ key: 'c', label: 'c', value: 9 }]);
  });

  it('turns counts into bars', () => {
    expect(countsToBars([{ key: 'k', label: 'L', count: 4 }])).toEqual([
      { key: 'k', label: 'L', value: 4 },
    ]);
  });
});
