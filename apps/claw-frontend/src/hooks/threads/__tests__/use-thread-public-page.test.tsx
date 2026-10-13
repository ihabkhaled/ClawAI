import { ThreadPublicationType } from '@claw/shared-types';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { useAuthStore } from '@/stores/auth.store';
import type {
  PublicThreadPublication,
  ThreadReactionSummary,
} from '@/types/thread-publication.types';
import { rememberReaction } from '@/utilities/thread-viewer-reaction.utility';

import { useThreadPublicPage } from '../use-thread-public-page';
import { useThreadPublicQueries } from '../use-thread-public-queries';

vi.mock('next/navigation', () => ({ useParams: () => ({ slug: 'slug-a' }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../use-thread-public-queries', () => ({ useThreadPublicQueries: vi.fn() }));
vi.mock('../use-thread-public-actions', () => ({ useThreadPublicActions: () => ({}) }));
vi.mock('../use-thread-public-view', () => ({ useThreadPublicView: vi.fn() }));

const PUBLICATION: PublicThreadPublication = {
  slug: 'slug-a',
  title: 'T',
  contentLocale: Locale.EN,
  publicationType: ThreadPublicationType.ARTICLE,
  content: { markdown: '# T', citations: [] },
  publishedAt: '2026-10-13T00:00:00.000Z',
  viewCount: 1,
  readerCount: 0,
};

function mockQueries(reactions: ThreadReactionSummary | undefined): void {
  vi.mocked(useThreadPublicQueries).mockReturnValue({
    publication: { data: PUBLICATION, error: null, isLoading: false, isError: false },
    comments: { data: [], isLoading: false, isError: false },
    reactions: { data: reactions, isLoading: false, isError: false },
  } as never);
}

describe('useThreadPublicPage viewer reaction', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'user-1' } as never, isAuthenticated: true });
  });

  afterEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('highlights the signed-in reader’s own reaction after a reload', () => {
    rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Like);
    mockQueries({ likes: 2, dislikes: 0, viewerReaction: null });

    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));

    expect(result.current.reactions?.viewerReaction).toBe(ThreadPublicationReaction.Like);
    expect(result.current.reactions?.likes).toBe(2);
  });

  it('shows nothing highlighted to a signed-out reader, whatever this browser remembers', () => {
    rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Like);
    useAuthStore.setState({ user: null, isAuthenticated: false });
    mockQueries({ likes: 2, dislikes: 0, viewerReaction: null });

    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));

    expect(result.current.reactions?.viewerReaction).toBeNull();
  });

  it('does not show another account’s reaction on a shared browser', () => {
    rememberReaction('user-2', 'slug-a', ThreadPublicationReaction.Dislike);
    mockQueries({ likes: 0, dislikes: 1, viewerReaction: null });

    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));

    expect(result.current.reactions?.viewerReaction).toBeNull();
  });

  it('prefers the service when it does know the reaction', () => {
    rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Like);
    mockQueries({ likes: 0, dislikes: 1, viewerReaction: ThreadPublicationReaction.Dislike });

    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));

    expect(result.current.reactions?.viewerReaction).toBe(ThreadPublicationReaction.Dislike);
  });

  it('returns no summary while reactions have not loaded', () => {
    mockQueries(undefined);

    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));

    expect(result.current.reactions).toBeUndefined();
  });
});
