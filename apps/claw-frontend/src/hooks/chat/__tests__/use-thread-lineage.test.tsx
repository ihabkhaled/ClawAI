import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThreadLineage } from '@/hooks/chat/use-thread-lineage';

const mockGetThreadLineage = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    getThreadLineage: (...args: unknown[]) => mockGetThreadLineage(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useThreadLineage', () => {
  beforeEach(() => {
    mockGetThreadLineage.mockReset();
  });

  it('reads the lineage of the current thread', async () => {
    const lineage = {
      threadId: 't1',
      parent: null,
      parentDeleted: false,
      forkMessageId: null,
      branches: [],
    };
    mockGetThreadLineage.mockResolvedValue(lineage);

    const { result } = renderHook(() => useThreadLineage('t1'), { wrapper });

    await waitFor(() => expect(result.current.lineage).toEqual(lineage));
    expect(mockGetThreadLineage).toHaveBeenCalledWith('t1');
  });

  it('does not ask before there is a thread id', () => {
    renderHook(() => useThreadLineage(''), { wrapper });

    expect(mockGetThreadLineage).not.toHaveBeenCalled();
  });

  it('degrades to no lineage when the request fails, never blocking the chat', async () => {
    mockGetThreadLineage.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useThreadLineage('t1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lineage).toBeNull();
  });
});
