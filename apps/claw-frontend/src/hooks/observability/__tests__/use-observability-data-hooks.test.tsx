import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scope } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useObservabilityFailures } from '@/hooks/observability/use-observability-failures';
import { useObservabilityTracing } from '@/hooks/observability/use-observability-tracing';
import { useUsageLeaderboard } from '@/hooks/observability/use-usage-leaderboard';

const mockGetLeaderboard = vi.fn();
const mockGetFailures = vi.fn();
const mockGetTracing = vi.fn();

vi.mock('@/repositories/admin/observability-explorer.repository', () => ({
  observabilityExplorerRepository: {
    getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
    getFailures: (...args: unknown[]) => mockGetFailures(...args),
    getTracing: (...args: unknown[]) => mockGetTracing(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('observability data hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-sorts a leaderboard and drops back to the first page', async () => {
    mockGetLeaderboard.mockResolvedValue({ items: [], nextCursor: 'x', dimension: 'provider' });
    const { result } = renderHook(
      () => useUsageLeaderboard(scope(), UsageLeaderboardDimension.Provider),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.page).not.toBeNull();
    });
    act(() => {
      result.current.pager.goNext('x');
    });
    act(() => {
      result.current.controls.toggleSort('tokens');
    });
    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenLastCalledWith(
        { hours: '168' },
        expect.objectContaining({ dimension: 'provider', sort: 'tokens', cursor: undefined }),
      );
    });
  });

  it('never queries while the range has an issue', async () => {
    const broken = scope({ issue: 'usageAnalytics.errorCustomRange' });
    renderHook(() => useUsageLeaderboard(broken, UsageLeaderboardDimension.Provider), { wrapper });
    renderHook(() => useObservabilityFailures(broken), { wrapper });
    renderHook(() => useObservabilityTracing(broken), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockGetLeaderboard).not.toHaveBeenCalled();
    expect(mockGetFailures).not.toHaveBeenCalled();
    expect(mockGetTracing).not.toHaveBeenCalled();
  });

  it('reports a failed load', async () => {
    mockGetLeaderboard.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(
      () => useUsageLeaderboard(scope(), UsageLeaderboardDimension.Provider),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('asks failures for the SAME window as the page, and hides workspace-sync noise by default', async () => {
    mockGetFailures.mockResolvedValue({
      hours: 168,
      groups: { items: [], page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    const { result } = renderHook(() => useObservabilityFailures(scope()), { wrapper });
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    expect(mockGetFailures).toHaveBeenCalledWith(
      expect.objectContaining({ hours: 168, includeSync: false, page: 1, sort: 'count' }),
    );
  });

  it('clamps a window longer than the audit endpoint allows and says so', async () => {
    mockGetFailures.mockResolvedValue({ hours: 720 });
    const long = scope({ buildHours: (max) => ({ hours: max, clamped: true }) });
    const { result } = renderHook(() => useObservabilityFailures(long), { wrapper });
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    expect(result.current.clamped).toBe(true);
    expect(mockGetFailures).toHaveBeenCalledWith(expect.objectContaining({ hours: 720 }));
  });

  it('goes back to page 1 when include-sync flips', async () => {
    mockGetFailures.mockResolvedValue({ hours: 168 });
    const { result } = renderHook(() => useObservabilityFailures(scope()), { wrapper });
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);
    act(() => {
      result.current.setIncludeSync(true);
    });
    expect(result.current.page).toBe(1);
  });

  it('only sends a tracing sort the endpoint knows', async () => {
    mockGetTracing.mockResolvedValue({ hours: 168, rows: { items: [] }, signals: [] });
    const { result } = renderHook(() => useObservabilityTracing(scope()), { wrapper });
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    act(() => {
      result.current.controls.toggleSort('lastSeen');
    });
    await waitFor(() => {
      expect(mockGetTracing).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'requests' }),
      );
    });
  });
});
