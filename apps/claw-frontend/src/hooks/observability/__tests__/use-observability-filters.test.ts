import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { useObservabilityFilters } from '@/hooks/observability/use-observability-filters';

describe('useObservabilityFilters', () => {
  it('defaults to the last 7 days with no filters', () => {
    const { result } = renderHook(() => useObservabilityFilters());
    expect(result.current.scope.selection.preset).toBe(UsageRangePreset.Week);
    expect(result.current.scope.buildParams()).toEqual({ hours: '168' });
  });

  it('applies a rolling preset at once', () => {
    const { result } = renderHook(() => useObservabilityFilters());
    act(() => {
      result.current.setPreset(UsageRangePreset.Month);
    });
    expect(result.current.scope.selection.preset).toBe(UsageRangePreset.Month);
    expect(result.current.scope.buildParams().from).toBeDefined();
  });

  it('holds typed hours as a draft until Apply, and never applies an invalid one', () => {
    const { result } = renderHook(() => useObservabilityFilters());
    act(() => {
      result.current.setPreset(UsageRangePreset.Hours);
    });
    act(() => {
      result.current.setHours('12');
    });
    expect(result.current.scope.selection.preset).toBe(UsageRangePreset.Week);
    act(() => {
      result.current.apply();
    });
    expect(result.current.scope.buildParams()).toEqual({ hours: '12' });

    act(() => {
      result.current.setHours('99999');
    });
    expect(result.current.issue).not.toBeNull();
    act(() => {
      result.current.apply();
    });
    expect(result.current.scope.buildParams()).toEqual({ hours: '12' });
  });

  it('applies a filter select at once and clears them all', () => {
    const { result } = renderHook(() => useObservabilityFilters());
    act(() => {
      result.current.setFilter('provider', 'GEMINI');
      result.current.setFilter('workflow', 'UNKNOWN');
    });
    expect(result.current.scope.buildParams()).toEqual({
      hours: '168',
      provider: 'GEMINI',
      workflow: 'UNKNOWN',
    });
    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.scope.buildParams()).toEqual({ hours: '168' });
  });

  it('can start from the page selection (the user dialog)', () => {
    const { result } = renderHook(() =>
      useObservabilityFilters({
        selection: { preset: UsageRangePreset.Hours, hours: 6, customFrom: '', customTo: '' },
        filters: { provider: 'GEMINI', model: '', workflow: '', billing: '' },
      }),
    );
    expect(result.current.scope.buildParams()).toEqual({ hours: '6', provider: 'GEMINI' });
  });
});
