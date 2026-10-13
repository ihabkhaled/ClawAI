import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import { useObservabilityUrl } from '@/hooks/observability/use-observability-url';

const mockReplace = vi.fn();
let mockQuery = '';
let mockPath = '/observability/users';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  usePathname: () => mockPath,
  useRouter: () => ({ replace: mockReplace }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery = '';
  mockPath = '/observability/users';
});

describe('useObservabilityUrl', () => {
  it('reads the period and filters from the URL', () => {
    mockQuery = 'period=30d&provider=GEMINI&plan=NONE';
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.state.period).toBe(ObservabilityPeriod.Last30Days);
    expect(result.current.state.provider).toBe('GEMINI');
    expect(result.current.scope.buildParams()).toEqual({
      days: '30',
      provider: 'GEMINI',
      plan: 'NONE',
    });
  });

  it('defaults to 7 days when the URL has no period', () => {
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.state.period).toBe(ObservabilityPeriod.Last7Days);
    expect(result.current.scope.buildParams()).toEqual({ days: '7' });
  });

  it('writes a period change with replace, without scrolling, and clears a custom range', () => {
    mockQuery = 'period=custom&from=2026-09-01&to=2026-09-30';
    const { result } = renderHook(() => useObservabilityUrl());
    act(() => {
      result.current.setPeriod(ObservabilityPeriod.Last24Hours);
    });
    expect(mockReplace).toHaveBeenCalledWith('/observability/users?period=24h', { scroll: false });
  });

  it('keeps the dates when the custom period is chosen', () => {
    mockQuery = 'period=7d&from=2026-09-01&to=2026-09-30';
    const { result } = renderHook(() => useObservabilityUrl());
    act(() => {
      result.current.setPeriod(ObservabilityPeriod.Custom);
    });
    expect(mockReplace).toHaveBeenCalledWith(
      '/observability/users?period=custom&from=2026-09-01&to=2026-09-30',
      { scroll: false },
    );
  });

  it('sets a filter and resets only the page, keeping search, sort and size', () => {
    mockQuery = 'period=7d&q=jane&sort=cost&order=asc&page=4&limit=50';
    const { result } = renderHook(() => useObservabilityUrl());
    act(() => {
      result.current.setFilter('provider', 'GEMINI');
    });
    expect(mockReplace).toHaveBeenCalledWith(
      '/observability/users?period=7d&q=jane&sort=cost&order=asc&limit=50&provider=GEMINI',
      { scroll: false },
    );
  });

  it('clears every filter but keeps the period', () => {
    mockQuery = 'period=30d&provider=GEMINI&model=m&plan=NONE&workflow=CHAT&billing=CREDIT';
    const { result } = renderHook(() => useObservabilityUrl());
    act(() => {
      result.current.clearFilters();
    });
    expect(mockReplace).toHaveBeenCalledWith('/observability/users?period=30d', { scroll: false });
  });

  it('opens and closes a user without touching the list controls', () => {
    mockQuery = 'period=7d&q=jane&page=2';
    const { result } = renderHook(() => useObservabilityUrl());
    act(() => {
      result.current.openUser('user-9');
    });
    expect(mockReplace).toHaveBeenLastCalledWith(
      '/observability/users?period=7d&q=jane&page=2&user=user-9',
      { scroll: false },
    );
  });

  it('closes the user and goes to the bare path when nothing else is set', () => {
    mockQuery = 'user=user-9';
    mockPath = '/observability';
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.state.user).toBe('user-9');
    act(() => {
      result.current.closeUser();
    });
    expect(mockReplace).toHaveBeenCalledWith('/observability', { scroll: false });
  });

  it('shares only the period and filters with links to other pages', () => {
    mockQuery = 'period=30d&provider=GEMINI&q=jane&page=2&user=u-1&top=25';
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.sharedQuery).toBe('period=30d&provider=GEMINI');
  });

  it('reports an invalid custom range', () => {
    mockQuery = 'period=custom&from=2026-09-30&to=2026-09-01';
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.issue).not.toBeNull();
    mockQuery = 'period=7d';
    const ok = renderHook(() => useObservabilityUrl());
    expect(ok.result.current.issue).toBeNull();
  });

  it('reads a list param by name, empty when missing', () => {
    mockQuery = 'q=jane';
    const { result } = renderHook(() => useObservabilityUrl());
    expect(result.current.param('q')).toBe('jane');
    expect(result.current.param('sort')).toBe('');
  });
});
