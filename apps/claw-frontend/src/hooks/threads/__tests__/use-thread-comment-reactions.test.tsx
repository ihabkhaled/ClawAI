import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { threadCommentFixture } from '@/test/fixtures/thread-comment.fixture';
import type { ThreadCommentsData, ThreadReactionCounts } from '@/types/thread-community.types';
import { findComment } from '@/utilities/thread-comment-tree.utility';

import { useThreadCommentReactions } from '../use-thread-comment-reactions';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { setCommentReaction: vi.fn(), removeCommentReaction: vi.fn() },
}));

const KEY = queryKeys.threadPublications.comments('s');

function seed(viewerReaction: ThreadPublicationReaction | null): ThreadCommentsData {
  return {
    pages: [
      {
        items: [threadCommentFixture({ id: 'c1', likes: 2, viewerReaction })],
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    ],
    pageParams: [1],
  };
}

function setup(viewerReaction: ThreadPublicationReaction | null = null): {
  client: QueryClient;
  wrapper: (props: { children: ReactNode }) => ReactElement;
} {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(KEY, seed(viewerReaction));
  return {
    client,
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

function likes(client: QueryClient): number | undefined {
  const cached = client.getQueryData<ThreadCommentsData>(KEY);
  return cached ? findComment(cached, 'c1')?.likes : undefined;
}

describe('useThreadCommentReactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the new count at once and keeps the server numbers on success', async () => {
    const { client, wrapper } = setup();
    let release: (value: ThreadReactionCounts) => void = () => undefined;
    vi.mocked(threadPublicationsRepository.setCommentReaction).mockReturnValue(
      new Promise<ThreadReactionCounts>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useThreadCommentReactions('s', 'c1'), { wrapper });

    act(() => result.current.toggle(ThreadPublicationReaction.Like));
    await waitFor(() => expect(likes(client)).toBe(3));
    await act(async () => {
      release({ likes: 5, dislikes: 0, viewerReaction: ThreadPublicationReaction.Like });
    });
    await waitFor(() => expect(likes(client)).toBe(5));
  });

  it('puts the old counts back when the server refuses', async () => {
    const { client, wrapper } = setup();
    vi.mocked(threadPublicationsRepository.setCommentReaction).mockRejectedValue(new Error('no'));
    const { result } = renderHook(() => useThreadCommentReactions('s', 'c1'), { wrapper });

    act(() => result.current.toggle(ThreadPublicationReaction.Like));

    await waitFor(() => expect(result.current.isFailed).toBe(true));
    expect(likes(client)).toBe(2);
    const cached = client.getQueryData<ThreadCommentsData>(KEY);
    expect(cached && findComment(cached, 'c1')?.viewerReaction).toBeNull();
  });

  it('clears with a DELETE when the same reaction is chosen again', async () => {
    const { client, wrapper } = setup(ThreadPublicationReaction.Like);
    vi.mocked(threadPublicationsRepository.removeCommentReaction).mockResolvedValue({
      likes: 1,
      dislikes: 0,
      viewerReaction: null,
    });
    const { result } = renderHook(() => useThreadCommentReactions('s', 'c1'), { wrapper });

    act(() => result.current.toggle(ThreadPublicationReaction.Like));

    await waitFor(() =>
      expect(threadPublicationsRepository.removeCommentReaction).toHaveBeenCalledWith('s', 'c1'),
    );
    await waitFor(() => expect(likes(client)).toBe(1));
  });
});
