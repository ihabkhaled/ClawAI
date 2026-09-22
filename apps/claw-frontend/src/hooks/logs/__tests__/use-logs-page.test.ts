import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLogsPage } from '@/hooks/logs/use-logs-page';

const getAuditLogs = vi.fn();
const getClientLogs = vi.fn();
const getServerLogs = vi.fn();

vi.mock('@/repositories/audit/audit.repository', () => ({
  auditRepository: { getAuditLogs: (...args: unknown[]) => getAuditLogs(...args) },
}));
vi.mock('@/repositories/logs/client-logs.repository', () => ({
  clientLogsRepository: { getLogs: (...args: unknown[]) => getClientLogs(...args) },
}));
vi.mock('@/repositories/logs/server-logs.repository', () => ({
  serverLogsRepository: { getLogs: (...args: unknown[]) => getServerLogs(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function lastLimit(spy: typeof getAuditLogs): unknown {
  const call = spy.mock.calls.at(-1);
  return (call?.[0] as { limit?: number } | undefined)?.limit;
}

const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

describe('useLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuditLogs.mockResolvedValue(emptyPage);
    getClientLogs.mockResolvedValue(emptyPage);
    getServerLogs.mockResolvedValue(emptyPage);
  });

  it.each([
    ['client', getClientLogs, 'setClientLogsPageSize', 'clientLogsPage', 'setClientLogsPage'],
    ['server', getServerLogs, 'setServerLogsPageSize', 'serverLogsPage', 'setServerLogsPage'],
    ['audit', getAuditLogs, 'setAuditPageSize', 'auditPage', 'setAuditPage'],
  ] as const)(
    'the %s tab sends the chosen page size and returns to page 1',
    async (_tab, spy, setSize, pageKey, setPage) => {
      const { result } = renderHook(() => useLogsPage(), { wrapper: makeWrapper() });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      // 25 was hard-coded here before; the size control would have changed nothing.
      expect(lastLimit(spy)).toBe(20);

      act(() => {
        (result.current[setPage] as (page: number) => void)(4);
      });
      expect(result.current[pageKey]).toBe(4);

      act(() => {
        (result.current[setSize] as (size: number) => void)(50);
      });
      expect(result.current[pageKey]).toBe(1);
      await waitFor(() => expect(lastLimit(spy)).toBe(50));
    },
  );

  it('returns each tab to page 1 when one of its filters changes', async () => {
    const { result } = renderHook(() => useLogsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(getClientLogs).toHaveBeenCalled());

    act(() => {
      result.current.setClientLogsPage(3);
      result.current.setServerLogsPage(3);
      result.current.setAuditPage(3);
    });

    act(() => {
      result.current.setClientSearch('boom');
    });
    act(() => {
      result.current.setServerSearch('boom');
    });
    act(() => {
      result.current.setAuditSearch('boom');
    });

    expect(result.current.clientLogsPage).toBe(1);
    expect(result.current.serverLogsPage).toBe(1);
    expect(result.current.auditPage).toBe(1);
  });
});
