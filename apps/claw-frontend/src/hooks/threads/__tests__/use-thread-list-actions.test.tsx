import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THREAD_LIST_QUERY_KEY_BASE } from '@/constants/thread-list.constants';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadListItem, ThreadListPage } from '@/types/thread-list.types';

import { useThreadListDelete } from '../use-thread-list-delete';
import { useThreadListPublish } from '../use-thread-list-publish';
import { useThreadListQuery } from '../use-thread-list-query';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    publish: vi.fn(),
    deletePublication: vi.fn(),
    listMinePage: vi.fn(),
  },
}));

const item = (id: string, over: Partial<ThreadListItem> = {}): ThreadListItem => ({
  id,
  title: `T ${id}`,
  slug: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  status: ThreadListStatus.READY,
  publishedAt: null,
  failure: null,
  canPublish: true,
  canDelete: true,
  ...over,
});

let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('thread list hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('useThreadListQuery asks for the page with the fixed size and keeps the old page while loading', async () => {
    const first: ThreadListPage = {
      items: [item('a')],
      page: 1,
      pageSize: 10,
      total: 11,
      totalPages: 2,
    };
    vi.mocked(threadPublicationsRepository.listMinePage).mockResolvedValueOnce(first);
    const { result, rerender } = renderHook(
      ({ page }) => useThreadListQuery({ q: '', status: ThreadListStatus.ALL, page }),
      { wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.data).toEqual(first));
    expect(threadPublicationsRepository.listMinePage).toHaveBeenCalledWith({
      q: '',
      status: 'ALL',
      page: 1,
      pageSize: 10,
    });

    vi.mocked(threadPublicationsRepository.listMinePage).mockReturnValueOnce(
      new Promise(() => undefined),
    );
    rerender({ page: 2 });

    expect(result.current.data).toEqual(first);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('publish flips the row to Published in the cache and refreshes', async () => {
    vi.mocked(threadPublicationsRepository.publish).mockResolvedValue(undefined);
    const cached: ThreadListPage = {
      items: [item('a'), item('b')],
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    };
    client.setQueryData([...THREAD_LIST_QUERY_KEY_BASE, 'page', '', 'ALL', 1], cached);
    const { result } = renderHook(() => useThreadListPublish(), { wrapper });

    act(() => result.current.publish(cached.items[0] as ThreadListItem));

    await waitFor(() =>
      expect(
        client.getQueryData<ThreadListPage>([...THREAD_LIST_QUERY_KEY_BASE, 'page', '', 'ALL', 1])
          ?.items[0],
      ).toMatchObject({ status: ThreadListStatus.PUBLISHED, canPublish: false }),
    );
    expect(threadPublicationsRepository.publish).toHaveBeenCalledWith('a');
    expect(
      client.getQueryData<ThreadListPage>([...THREAD_LIST_QUERY_KEY_BASE, 'page', '', 'ALL', 1])
        ?.items[1]?.status,
    ).toBe(ThreadListStatus.READY);
    expect(result.current.error).toBeNull();
  });

  it('publish reports a refusal against that row', async () => {
    vi.mocked(threadPublicationsRepository.publish).mockRejectedValue(
      new ApiClientError({ message: 'no', status: 409 }),
    );
    const { result } = renderHook(() => useThreadListPublish(), { wrapper });

    act(() => result.current.publish(item('a')));

    await waitFor(() => expect(result.current.error?.id).toBe('a'));
    expect(result.current.error?.message).toEqual({ key: 'chat.threadProgress.error.conflict' });
    expect(result.current.publishingId).toBeNull();
  });

  it('delete asks first, then deletes, closes and calls onDeleted', async () => {
    vi.mocked(threadPublicationsRepository.deletePublication).mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useThreadListDelete(onDeleted, () => null), { wrapper });
    expect(result.current.remove.isOpen).toBe(false);

    act(() => result.current.ask(item('a')));
    expect(result.current.remove.isOpen).toBe(true);
    expect(threadPublicationsRepository.deletePublication).not.toHaveBeenCalled();

    act(() => result.current.remove.confirm());

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(threadPublicationsRepository.deletePublication).toHaveBeenCalledWith('a');
    expect(result.current.remove.isOpen).toBe(false);
  });

  it('delete keeps the dialog open and explains a refusal; cancel closes without deleting', async () => {
    vi.mocked(threadPublicationsRepository.deletePublication).mockRejectedValue(
      new ApiClientError({ message: 'gone', status: 404 }),
    );
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useThreadListDelete(onDeleted, () => null), { wrapper });

    act(() => result.current.ask(item('a')));
    act(() => result.current.remove.confirm());
    await waitFor(() =>
      expect(result.current.remove.error).toEqual({ key: 'chat.threadProgress.error.notFound' }),
    );
    expect(result.current.remove.isOpen).toBe(true);
    expect(onDeleted).not.toHaveBeenCalled();

    act(() => result.current.remove.setOpen(false));
    expect(result.current.remove.isOpen).toBe(false);
  });
});
