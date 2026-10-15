import { ThreadPublicationType } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicPageView } from '@/components/threads/thread-publication-page-view';
import { Locale } from '@/enums/locale.enum';
import type { ThreadPublicPageController } from '@/types/thread-publication.types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/threads/thread-export-panel', () => ({ ThreadExportPanel: () => <div /> }));
vi.mock('@/components/threads/thread-public-article', () => ({
  ThreadPublicArticle: () => <article />,
}));
vi.mock('@/components/threads/thread-public-back-link', () => ({
  ThreadPublicBackLink: () => <a href="/threads/board">back</a>,
}));
vi.mock('@/components/threads/thread-public-community', () => ({
  ThreadPublicCommunity: () => <section />,
}));
vi.mock('@/components/threads/thread-share-menu', () => ({ ThreadShareMenu: () => <div /> }));

const STATE: ThreadPublicPageController = {
  shareUrl: null,
  buildExportFile: vi.fn(),
  publication: {
    slug: 'a-1',
    title: 'T',
    contentLocale: Locale.EN,
    publicationType: ThreadPublicationType.ARTICLE,
    content: { markdown: '# T', citations: [] },
    publishedAt: '2026-10-13T00:00:00.000Z',
    viewCount: 1,
    readerCount: 0,
  },
  comments: [],
  highlightedCommentId: null,
  commentMissing: false,
  commentTotal: 0,
  hasMoreComments: false,
  isLoadingMoreComments: false,
  loadMoreComments: vi.fn(),
  reactions: undefined,
  isAuthenticated: false,
  isLoading: false,
  isNotFound: false,
  isError: false,
  communityLoading: false,
  communityError: false,
  loginHref: '/login',
  actions: {} as ThreadPublicPageController['actions'],
  viewer: undefined,
  changeCredits: [],
};

describe('ThreadPublicPageView suggestions', () => {
  it('shows the owner how many suggestions wait, with a link to the review screen', () => {
    render(
      <ThreadPublicPageView
        state={{
          ...STATE,
          viewer: { isOwner: true, publicationId: 'pub-9', pendingChangeRequests: 3 },
        }}
      />,
    );
    expect(screen.getByTestId('thread-owner-change-bar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.threadCrOwnerBarReview' })).toHaveAttribute(
      'href',
      '/threads/review/pub-9',
    );
  });

  it('shows nothing owner-only to a guest, a non-owner or an owner with nothing waiting', () => {
    for (const viewer of [
      undefined,
      { isOwner: false as const },
      { isOwner: true as const, publicationId: 'pub-9', pendingChangeRequests: 0 },
    ]) {
      const { unmount } = render(<ThreadPublicPageView state={{ ...STATE, viewer }} />);
      expect(screen.queryByTestId('thread-owner-change-bar')).toBeNull();
      unmount();
    }
  });

  it('credits the people whose suggestion was accepted, and omits the line when there are none', () => {
    const { rerender } = render(<ThreadPublicPageView state={STATE} />);
    expect(screen.queryByTestId('thread-change-credits')).toBeNull();

    rerender(
      <ThreadPublicPageView
        state={{
          ...STATE,
          changeCredits: [
            { displayName: 'Chen Charlie', username: 'qa8_c' },
            { displayName: 'Ada', username: 'ada' },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('thread-change-credits')).toHaveTextContent('@qa8_c, @ada');
  });
});

describe('ThreadPublicPageView', () => {
  it('does not add a second main landmark inside the marketing layout main', () => {
    const { container } = render(<ThreadPublicPageView state={STATE} />);
    expect(container.querySelector('main')).toBeNull();
    expect(container.querySelector('article')).not.toBeNull();
  });
});
