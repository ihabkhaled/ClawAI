import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants/routes.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { useThreadDeleteAction } from '../use-thread-delete-action';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { deletePublication: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useThreadDeleteAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes, closes the dialog and returns to the list', async () => {
    vi.mocked(threadPublicationsRepository.deletePublication).mockResolvedValue(undefined);
    const { result } = renderHook(() => useThreadDeleteAction('pub-1'), { wrapper });
    act(() => result.current.setOpen(true));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.confirm());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ROUTES.THREAD_PUBLICATIONS));
    expect(threadPublicationsRepository.deletePublication).toHaveBeenCalledWith('pub-1');
    expect(result.current.isOpen).toBe(false);
  });

  it('keeps the dialog open and explains a refusal', async () => {
    vi.mocked(threadPublicationsRepository.deletePublication).mockRejectedValue(
      new ApiClientError({ message: 'gone', status: 404 }),
    );
    const { result } = renderHook(() => useThreadDeleteAction('pub-1'), { wrapper });
    act(() => result.current.setOpen(true));

    act(() => result.current.confirm());

    await waitFor(() =>
      expect(result.current.error).toEqual({ key: 'chat.threadProgress.error.notFound' }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.setOpen(false));
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.error).toBeNull();
  });
});
