import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  detail,
  groupRow,
  scope,
  userRow,
} from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { ObservabilityTab } from '@/enums/observability-tab.enum';
import { Permission } from '@/enums/permission.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useExplorerFilterOptions } from '@/hooks/observability/use-explorer-filter-options';
import { useObservabilityExplorer } from '@/hooks/observability/use-observability-explorer';
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
vi.mock('@/hooks/auth/use-permissions');

const mockPermissions = vi.mocked(usePermissions);

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function grant(...allowed: Permission[]): void {
  mockPermissions.mockReturnValue({
    isAdmin: true,
    isSuperAdmin: false,
    can: (permission) => allowed.includes(permission),
    canAny: () => false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLeaderboard.mockResolvedValue({ items: [] });
});

describe('useObservabilityExplorer', () => {
  it('offers all six tabs to an admin who can view system health', () => {
    grant(Permission.ADMIN_USAGE_VIEW, Permission.ADMIN_SYSTEM_VIEW);
    const { result } = renderHook(() => useObservabilityExplorer(), { wrapper });
    expect(result.current.tabs.map((definition) => definition.tab)).toEqual([
      ObservabilityTab.Overview,
      ObservabilityTab.Consumption,
      ObservabilityTab.Models,
      ObservabilityTab.Users,
      ObservabilityTab.Tracing,
      ObservabilityTab.Failures,
    ]);
    expect(result.current.tab).toBe(ObservabilityTab.Overview);
  });

  it('drops the Failures tab without ADMIN_SYSTEM_VIEW', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    const { result } = renderHook(() => useObservabilityExplorer(), { wrapper });
    expect(result.current.tabs.map((definition) => definition.tab)).not.toContain(
      ObservabilityTab.Failures,
    );
  });

  it('switches tab and tracks the open user', () => {
    grant(Permission.ADMIN_USAGE_VIEW);
    const { result } = renderHook(() => useObservabilityExplorer(), { wrapper });
    act(() => {
      result.current.setTab(ObservabilityTab.Users);
      result.current.setOpenUserId('user-3');
    });
    expect(result.current.tab).toBe(ObservabilityTab.Users);
    expect(result.current.openUserId).toBe('user-3');
  });
});

describe('useExplorerFilterOptions', () => {
  it('lists every provider, model and workflow of the PERIOD, ignoring the applied filters', async () => {
    mockGetLeaderboard
      .mockResolvedValueOnce({
        items: [groupRow({ provider: 'LOCAL_OLLAMA', providerLabel: 'Local Ollama' })],
      })
      .mockResolvedValueOnce({ items: [groupRow({ model: 'm-1' })] })
      .mockResolvedValueOnce({ items: [groupRow({ key: 'UNKNOWN' }), groupRow({ key: 'CHAT' })] });
    const rangeOnly = vi.fn(() => ({ hours: '168' }));
    const { result } = renderHook(
      () =>
        useExplorerFilterOptions(
          scope({
            buildRangeParams: rangeOnly,
            buildParams: () => ({ hours: '168', provider: 'GEMINI' }),
          }),
        ),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.models).toEqual(['m-1']);
    });
    expect(result.current.providers).toEqual([{ value: 'LOCAL_OLLAMA', label: 'Local Ollama' }]);
    expect(result.current.workflows).toEqual(['UNKNOWN', 'CHAT']);
    expect(rangeOnly).toHaveBeenCalled();
    expect(mockGetLeaderboard).toHaveBeenCalledTimes(3);
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ hours: '168' }, expect.anything());
  });
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
