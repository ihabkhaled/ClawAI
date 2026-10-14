import { ThreadPublicationType } from '@claw/shared-types';
import { render } from '@testing-library/react';
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
};

describe('ThreadPublicPageView', () => {
  it('does not add a second main landmark inside the marketing layout main', () => {
    const { container } = render(<ThreadPublicPageView state={STATE} />);
    expect(container.querySelector('main')).toBeNull();
    expect(container.querySelector('article')).not.toBeNull();
  });
});
