import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  detail,
  scope,
  userRow,
} from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { useUsageTimeseries } from '@/hooks/observability/use-usage-timeseries';
import { useUserConsumption } from '@/hooks/observability/use-user-consumption';

const mockGetLeaderboard = vi.fn();
const mockGetTimeseries = vi.fn();
const mockGetUserDetail = vi.fn();
const mockGetUserRequests = vi.fn();

vi.mock('@/repositories/admin/observability-explorer.repository', () => ({
  observabilityExplorerRepository: {
    getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
    getTimeseries: (...args: unknown[]) => mockGetTimeseries(...args),
    getUserDetail: (...args: unknown[]) => mockGetUserDetail(...args),
    getUserRequests: (...args: unknown[]) => mockGetUserRequests(...args),
  },
}));
function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLeaderboard.mockResolvedValue({ items: [] });
});

describe('useUsageTimeseries', () => {
  it('loads totals and the series for the scope', async () => {
    mockGetTimeseries.mockResolvedValue({ totals: {}, series: [] });
    const { result } = renderHook(() => useUsageTimeseries(scope()), { wrapper });
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    expect(mockGetTimeseries).toHaveBeenCalledWith({ hours: '168' }, '');
  });
});

describe('useUserConsumption', () => {
  it('loads THAT user from the page period, with its own copy of the filters', async () => {
    mockGetUserDetail.mockResolvedValue(detail());
    mockGetUserRequests.mockResolvedValue({ items: [], nextCursor: null });
    const { result } = renderHook(
      () =>
        useUserConsumption(
          'user-1',
          scope({
            selection: { preset: UsageRangePreset.Hours, hours: 6, customFrom: '', customTo: '' },
            buildParams: () => ({ hours: '6' }),
          }),
        ),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.detail).not.toBeNull();
    });
    expect(mockGetUserDetail).toHaveBeenCalledWith('user-1', { hours: '6' });
    expect(mockGetUserRequests).toHaveBeenCalledWith(
      'user-1',
      { hours: '6' },
      expect.objectContaining({ sort: 'time', order: 'desc', limit: 10 }),
    );
  });

  it('re-queries with a provider filter chosen inside the dialog only', async () => {
    mockGetUserDetail.mockResolvedValue(detail());
    mockGetUserRequests.mockResolvedValue({ items: [userRow()], nextCursor: 'n' });
    const pageScope = scope();
    const { result } = renderHook(() => useUserConsumption('user-1', pageScope), { wrapper });
    await waitFor(() => {
      expect(result.current.detail).not.toBeNull();
    });
    act(() => {
      result.current.filters.setFilter('provider', 'GEMINI');
    });
    await waitFor(() => {
      expect(mockGetUserDetail).toHaveBeenLastCalledWith(
        'user-1',
        expect.objectContaining({ provider: 'GEMINI' }),
      );
    });
    // The page's own scope is untouched.
    expect(pageScope.filters.provider).toBe('');
  });

  it('reports an error when the user cannot be loaded', async () => {
    mockGetUserDetail.mockRejectedValue(new Error('USER_NOT_FOUND'));
    mockGetUserRequests.mockResolvedValue({ items: [], nextCursor: null });
    const { result } = renderHook(() => useUserConsumption('missing', scope()), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
