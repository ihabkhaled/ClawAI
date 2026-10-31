import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadListItem } from '@/types/thread-list.types';

import { useThreadList } from '../use-thread-list';

const push = vi.fn();
const replace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/threads',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    listMinePage: vi.fn(),
    publish: vi.fn(),
    deletePublication: vi.fn(),
  },
}));

const row: ThreadListItem = {
  id: 'a',
  title: 'A',
  slug: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  status: ThreadListStatus.READY,
  publishedAt: null,
  failure: null,
  canPublish: true,
  canDelete: true,
};

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = 'page=3&status=READY';
    vi.mocked(threadPublicationsRepository.listMinePage).mockResolvedValue({
      items: [row],
      page: 3,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('loads the page named by the address', async () => {
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(threadPublicationsRepository.listMinePage).toHaveBeenCalledWith({
      q: '',
      status: ThreadListStatus.READY,
      page: 3,
      pageSize: 10,
    });
  });

  it('a new status returns to page 1 and adds a history entry', async () => {
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    act(() => result.current.setStatus(ThreadListStatus.FAILED));
    expect(push).toHaveBeenCalledWith('/threads?status=FAILED', { scroll: false });
  });

  it('paging pushes the page', async () => {
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    act(() => result.current.setPage(2));
    expect(push).toHaveBeenCalledWith('/threads?status=READY&page=2', { scroll: false });
  });

  it('deleting the last row of a later page steps back one page', async () => {
    vi.mocked(threadPublicationsRepository.deletePublication).mockResolvedValue(undefined);
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));

    act(() => result.current.askDelete(row));
    act(() => result.current.remove.confirm());

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/threads?status=READY&page=2', { scroll: false }),
    );
  });

  it('clearing filters goes to the bare list', async () => {
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    act(() => result.current.clearFilters());
    expect(push).toHaveBeenCalledWith('/threads', { scroll: false });
  });
});

describe('useThreadList page clamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = 'page=9';
  });

  it('replaces the address with the last page when the page is past the end', async () => {
    vi.mocked(threadPublicationsRepository.listMinePage).mockResolvedValue({
      items: [],
      page: 9,
      pageSize: 10,
      total: 15,
      totalPages: 2,
    });
    renderHook(() => useThreadList({ current: null }), { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/threads?page=2', { scroll: false }));
  });

  it('leaves a valid page alone', async () => {
    search = 'page=2';
    vi.mocked(threadPublicationsRepository.listMinePage).mockResolvedValue({
      items: [row],
      page: 2,
      pageSize: 10,
      total: 15,
      totalPages: 2,
    });
    const { result } = renderHook(() => useThreadList({ current: null }), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(replace).not.toHaveBeenCalled();
  });
});
