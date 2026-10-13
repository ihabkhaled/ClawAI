import { describe, expect, it } from 'vitest';

import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import {
  applyUpdates,
  buildPeriodParams,
  buildScope,
  buildSharedQuery,
  decodePathSegment,
  hasActiveFilters,
  isProviderDetailPath,
  parseUrlState,
  readPage,
  readPositiveInt,
  readSortOrder,
  stateToSelection,
  withQuery,
} from '@/utilities/observability-url.utility';

const NOW = new Date('2026-10-08T12:30:00.000Z');

function state(query: string) {
  return parseUrlState(new URLSearchParams(query));
}

describe('parseUrlState', () => {
  it('defaults to the last 7 days with no filters', () => {
    expect(state('')).toEqual({
      period: ObservabilityPeriod.Last7Days,
      from: '',
      to: '',
      provider: '',
      model: '',
      plan: '',
      workflow: '',
      billing: '',
      user: '',
    });
  });

  it('reads every key', () => {
    const parsed = state(
      'period=custom&from=2026-09-01&to=2026-09-30&provider=GEMINI&model=gpt-4o&plan=NONE&workflow=CHAT&billing=CREDIT&user=u-1',
    );
    expect(parsed).toMatchObject({
      period: 'custom',
      from: '2026-09-01',
      to: '2026-09-30',
      provider: 'GEMINI',
      model: 'gpt-4o',
      plan: 'NONE',
      workflow: 'CHAT',
      billing: 'CREDIT',
      user: 'u-1',
    });
  });

  it('falls back instead of throwing on junk', () => {
    const parsed = state('period=forever&from=yesterday&to=2026-13&billing=FREE');
    expect(parsed.period).toBe(ObservabilityPeriod.Last7Days);
    expect(parsed.from).toBe('');
    expect(parsed.to).toBe('');
    expect(parsed.billing).toBe('');
  });

  it('caps a very long value', () => {
    expect(state(`provider=${'x'.repeat(500)}`).provider).toHaveLength(200);
  });
});

describe('buildPeriodParams', () => {
  it('asks for rolling windows by hours or days, never a client-computed start', () => {
    expect(buildPeriodParams(state('period=24h'), NOW)).toEqual({ hours: '24' });
    expect(buildPeriodParams(state('period=7d'), NOW)).toEqual({ days: '7' });
    expect(buildPeriodParams(state('period=30d'), NOW)).toEqual({ days: '30' });
    expect(buildPeriodParams(state('period=90d'), NOW)).toEqual({ days: '90' });
  });

  it('starts today at the UTC midnight', () => {
    expect(buildPeriodParams(state('period=today'), NOW)).toEqual({
      from: '2026-10-08T00:00:00.000Z',
    });
  });

  it('closes a custom range at the next midnight so the end date is inclusive', () => {
    expect(buildPeriodParams(state('period=custom&from=2026-09-01&to=2026-09-30'), NOW)).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
    });
  });

  it('sends nothing for a custom range that is not filled in', () => {
    expect(buildPeriodParams(state('period=custom'), NOW)).toEqual({});
  });
});

describe('stateToSelection', () => {
  it('maps each period to the selection the dialog understands', () => {
    expect(stateToSelection(state('period=today'), NOW).preset).toBe(UsageRangePreset.Today);
    expect(stateToSelection(state('period=24h'), NOW)).toMatchObject({
      preset: UsageRangePreset.Hours,
      hours: 24,
    });
    expect(stateToSelection(state('period=7d'), NOW).preset).toBe(UsageRangePreset.Week);
    expect(stateToSelection(state('period=30d'), NOW).preset).toBe(UsageRangePreset.Month);
  });

  it('turns 90 days into an inclusive 90-day custom range ending today', () => {
    expect(stateToSelection(state('period=90d'), NOW)).toMatchObject({
      preset: UsageRangePreset.Custom,
      customFrom: '2026-07-11',
      customTo: '2026-10-08',
    });
  });
});

describe('buildScope', () => {
  it('adds the non-empty filters, including the plan, to the period', () => {
    const scope = buildScope(state('period=7d&provider=GEMINI&plan=NONE&billing=CREDIT'), NOW);
    expect(scope.buildParams()).toEqual({
      days: '7',
      provider: 'GEMINI',
      plan: 'NONE',
      billing: 'CREDIT',
    });
  });

  it('leaves the filters out of the range-only params used for the filter choices', () => {
    const scope = buildScope(state('period=7d&provider=GEMINI'), NOW);
    expect(scope.buildRangeParams()).toEqual({ days: '7' });
  });

  it('does not turn the open user into a filter', () => {
    const scope = buildScope(state('period=7d&user=u-1'), NOW);
    expect(scope.buildParams()).toEqual({ days: '7' });
  });

  it('clamps the audit hours and says so for 90 days', () => {
    const scope = buildScope(state('period=90d'), NOW);
    expect(scope.buildHours(720)).toEqual({ hours: 720, clamped: true });
    expect(buildScope(state('period=24h'), NOW).buildHours(720)).toEqual({
      hours: 24,
      clamped: false,
    });
  });
});

describe('applyUpdates', () => {
  it('sets and removes keys', () => {
    const params = new URLSearchParams('period=7d&provider=GEMINI');
    expect(applyUpdates(params, { provider: null, model: 'm-1' }, true)).toBe(
      'period=7d&model=m-1',
    );
    expect(applyUpdates(params, { provider: '' }, true)).toBe('period=7d');
  });

  it('resets only the page number when the period or a filter changes', () => {
    const params = new URLSearchParams('period=7d&q=jane&sort=cost&order=asc&limit=50&page=3');
    expect(applyUpdates(params, { provider: 'GEMINI' }, false)).toBe(
      'period=7d&q=jane&sort=cost&order=asc&limit=50&provider=GEMINI',
    );
  });

  it('keeps an explicit page written in the same update', () => {
    const params = new URLSearchParams('page=3&q=jane');
    expect(applyUpdates(params, { page: '2' }, false)).toBe('page=2&q=jane');
  });

  it('keeps the list controls when only the list changes', () => {
    const params = new URLSearchParams('period=7d&q=jane&sort=cost&page=3');
    expect(applyUpdates(params, { page: '4' }, true)).toBe('period=7d&q=jane&sort=cost&page=4');
  });

  it('keeps an explicit list key written in the same update', () => {
    const params = new URLSearchParams('page=3&q=jane');
    expect(applyUpdates(params, { q: 'bob' }, false)).toBe('q=bob');
  });

  it('keeps search, sort and size across a period change', () => {
    const params = new URLSearchParams('period=7d&q=jane&sort=requests&order=asc&limit=50&page=4');
    expect(applyUpdates(params, { period: '30d' }, false)).toBe(
      'period=30d&q=jane&sort=requests&order=asc&limit=50',
    );
  });
});

describe('links and readers', () => {
  it('carries only the shared keys into a link to another page', () => {
    const params = new URLSearchParams('period=30d&provider=GEMINI&q=jane&page=2&user=u-1&top=25');
    expect(buildSharedQuery(params)).toBe('period=30d&provider=GEMINI');
  });

  it('appends a query only when there is one', () => {
    expect(withQuery('/observability', '')).toBe('/observability');
    expect(withQuery('/observability', 'period=7d')).toBe('/observability?period=7d');
  });

  it('reads a page, a size and a sort order defensively', () => {
    expect(readPage('3')).toBe(3);
    expect(readPage('0')).toBe(1);
    expect(readPage('abc')).toBe(1);
    expect(readPage(null)).toBe(1);
    expect(readPositiveInt('50', 20, [10, 20, 50])).toBe(50);
    expect(readPositiveInt('7', 20, [10, 20, 50])).toBe(20);
    expect(readPositiveInt('', 20, [10, 20, 50])).toBe(20);
    expect(readSortOrder('asc', 'desc')).toBe('asc');
    expect(readSortOrder('sideways', 'desc')).toBe('desc');
  });

  it('decodes a path segment and keeps a malformed escape as typed', () => {
    expect(decodePathSegment('LOCAL%20OLLAMA')).toBe('LOCAL OLLAMA');
    expect(decodePathSegment('100%')).toBe('100%');
  });

  it('knows when a filter, but not the period, is set', () => {
    expect(hasActiveFilters(state('period=30d'))).toBe(false);
    expect(hasActiveFilters(state('plan=NONE'))).toBe(true);
  });
});

describe('isProviderDetailPath', () => {
  it('is true on a provider page only', () => {
    expect(isProviderDetailPath('/observability/providers/GEMINI')).toBe(true);
    expect(isProviderDetailPath('/observability/providers')).toBe(false);
    expect(isProviderDetailPath('/observability/models/detail')).toBe(false);
    expect(isProviderDetailPath('/observability')).toBe(false);
  });
});
