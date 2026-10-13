import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { useAuthStore } from '@/stores/auth.store';
import { readRememberedReaction } from '@/utilities/thread-viewer-reaction.utility';

import { useThreadPublicMutation } from '../use-thread-public-mutation';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    addPublicComment: vi.fn(),
    requestPublicChange: vi.fn(),
    reportPublicPublication: vi.fn(),
    setPublicReaction: vi.fn(),
    removePublicReaction: vi.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useThreadPublicMutation remembers the viewer reaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('keeps a like so it can be highlighted again after a reload', async () => {
    vi.mocked(threadPublicationsRepository.setPublicReaction).mockResolvedValue({
      likes: 1,
      dislikes: 0,
      viewerReaction: ThreadPublicationReaction.Like,
    });
    const client = new QueryClient();
    const { result } = renderHook(() => useThreadPublicMutation('slug-a'), {
      wrapper: wrapper(client),
    });

    act(() =>
      result.current.mutate({
        kind: ThreadPublicationCommunityAction.Reaction,
        value: ThreadPublicationReaction.Like,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(readRememberedReaction('user-1', 'slug-a')).toBe(ThreadPublicationReaction.Like);
    expect(client.getQueryData(['thread-publications', 'public', 'slug-a', 'reactions'])).toEqual({
      likes: 1,
      dislikes: 0,
      viewerReaction: ThreadPublicationReaction.Like,
    });
  });

  it('forgets it when the reaction is removed', async () => {
    window.localStorage.setItem('claw.thread-reaction:user-1:slug-a', 'LIKE');
    vi.mocked(threadPublicationsRepository.removePublicReaction).mockResolvedValue({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
    const { result } = renderHook(() => useThreadPublicMutation('slug-a'), {
      wrapper: wrapper(new QueryClient()),
    });

    act(() =>
      result.current.mutate({ kind: ThreadPublicationCommunityAction.Reaction, value: null }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(readRememberedReaction('user-1', 'slug-a')).toBeNull();
  });

  it('remembers nothing for a comment, and nothing when the reaction request fails', async () => {
    vi.mocked(threadPublicationsRepository.addPublicComment).mockResolvedValue(undefined as never);
    vi.mocked(threadPublicationsRepository.setPublicReaction).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useThreadPublicMutation('slug-a'), {
      wrapper: wrapper(new QueryClient()),
    });

    act(() =>
      result.current.mutate({ kind: ThreadPublicationCommunityAction.Comment, content: 'Hi' }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() =>
      result.current.mutate({
        kind: ThreadPublicationCommunityAction.Reaction,
        value: ThreadPublicationReaction.Like,
      }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readRememberedReaction('user-1', 'slug-a')).toBeNull();
  });
});
