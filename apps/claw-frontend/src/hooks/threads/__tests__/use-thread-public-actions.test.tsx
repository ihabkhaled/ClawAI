import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { useThreadPublicActions } from '../use-thread-public-actions';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    addPublicComment: vi.fn(),
    setPublicReaction: vi.fn(),
    removePublicReaction: vi.fn(),
    requestPublicChange: vi.fn(),
    reportPublicPublication: vi.fn(),
  },
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren): React.ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useThreadPublicActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits an authenticated comment and clears the editor on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(threadPublicationsRepository.addPublicComment).mockResolvedValue({
      id: 'comment-1',
      content: 'Useful.',
      createdAt: '2026-10-05T12:00:00.000Z',
    });
    const { result } = renderHook(() => useThreadPublicActions('clear-writing'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.setComment('Useful.');
    });
    act(() => {
      result.current.submitComment();
    });

    await waitFor(() => expect(result.current.actionComplete).toBe(true));
    expect(threadPublicationsRepository.addPublicComment).toHaveBeenCalledWith('clear-writing', {
      content: 'Useful.',
    });
    expect(result.current.comment).toBe('');
  });

  it('updates reaction totals from the server response without refetching viewer state', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const summary = {
      likes: 4,
      dislikes: 1,
      viewerReaction: ThreadPublicationReaction.Like,
    };
    vi.mocked(threadPublicationsRepository.setPublicReaction).mockResolvedValue(summary);
    const { result } = renderHook(() => useThreadPublicActions('clear-writing'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.setReaction(ThreadPublicationReaction.Like));

    await waitFor(() =>
      expect(
        queryClient.getQueryData(['thread-publications', 'public', 'clear-writing', 'reactions']),
      ).toEqual(summary),
    );
  });
});
