import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFeedbackList } from '@/hooks/admin/feedback/use-admin-feedback-list';

const list = vi.fn();
const stats = vi.fn();

vi.mock('@/repositories/feedback/feedback-admin.repository', () => ({
  feedbackAdminRepository: {
    list: (...args: unknown[]) => list(...args),
    stats: (...args: unknown[]) => stats(...args),
  },
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
  const call = list.mock.calls.at(-1);
  return (call?.[0] as { limit?: number } | undefined)?.limit;
}

describe('useAdminFeedbackList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ items: [], total: 213, page: 1, limit: 20 });
    stats.mockResolvedValue({});
  });

  it('sends the chosen page size as the limit, not the hard-coded 20', async () => {
    const { result } = renderHook(() => useAdminFeedbackList(), { wrapper: makeWrapper() });
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(lastLimit()).toBe(20);

    act(() => {
      result.current.setPageSize(50);
    });
    await waitFor(() => expect(lastLimit()).toBe(50));
  });

  it('returns to page 1 when the page size changes, and re-counts the pages', async () => {
    const { result } = renderHook(() => useAdminFeedbackList(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.total).toBe(213));
    expect(result.current.totalPages).toBe(11);

    act(() => {
      result.current.setPage(7);
    });
    expect(result.current.page).toBe(7);

    act(() => {
      result.current.setPageSize(50);
    });
    expect(result.current.page).toBe(1);
    await waitFor(() => expect(result.current.totalPages).toBe(5));
  });

  it('returns to page 1 when a filter or the search changes', async () => {
    const { result } = renderHook(() => useAdminFeedbackList(), { wrapper: makeWrapper() });
    await waitFor(() => expect(list).toHaveBeenCalled());

    act(() => {
      result.current.setPage(4);
    });
    act(() => {
      result.current.setStatus('OPEN');
    });
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(4);
    });
    act(() => {
      result.current.setSearch('crash');
    });
    expect(result.current.page).toBe(1);
  });
});
