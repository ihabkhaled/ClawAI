import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuditsPage } from '@/hooks/audit/use-audits-page';

const getAuditLogs = vi.fn();

vi.mock('@/repositories/audit/audit.repository', () => ({
  auditRepository: { getAuditLogs: (...args: unknown[]) => getAuditLogs(...args) },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function lastLimit(): unknown {
  const call = getAuditLogs.mock.calls.at(-1);
  return (call?.[0] as { limit?: number } | undefined)?.limit;
}

describe('useAuditsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuditLogs.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it('sends the chosen page size as the limit, not a hard-coded one', async () => {
    const { result } = renderHook(() => useAuditsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalled());
    expect(lastLimit()).toBe(20);

    act(() => {
      result.current.setPageSize(50);
    });
    await waitFor(() => expect(lastLimit()).toBe(50));
  });

  it('returns to page 1 when the page size changes', async () => {
    const { result } = renderHook(() => useAuditsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalled());

    act(() => {
      result.current.setPage(4);
    });
    expect(result.current.page).toBe(4);

    act(() => {
      result.current.setPageSize(50);
    });
    expect(result.current.page).toBe(1);
  });

  it('returns to page 1 when a filter changes', async () => {
    const { result } = renderHook(() => useAuditsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalled());

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.handleSearchChange('login');
    });
    expect(result.current.page).toBe(1);
  });
});
