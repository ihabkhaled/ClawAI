import { ThreadPublicationType } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { BoardReaderController } from '@/types/thread-board-reader.types';
import type { ThreadCommunityActionState } from '@/types/thread-publication.types';

import { BoardReaderActions } from '../board-reader-actions';
import { BoardReaderView } from '../board-reader-view';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/components/chat-shares/public-markdown-renderer', () => ({
  PublicMarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

function createActions(): ThreadCommunityActionState {
  return {
    comment: '',
    suggestion: '',
    reportTarget: null,
    reportReason: ThreadPublicationReportReason.Other,
    reportDetails: '',
    isSubmitting: false,
    actionComplete: false,
    actionFailed: false,
    actionErrorKey: null,
    setComment: vi.fn(),
    setSuggestion: vi.fn(),
    setReportTarget: vi.fn(),
    setReportReason: vi.fn(),
    setReportDetails: vi.fn(),
    submitComment: vi.fn(),
    submitChangeRequest: vi.fn(),
    submitReport: vi.fn(),
    setReaction: vi.fn(),
  };
}

function createState(overrides: Partial<BoardReaderController> = {}): BoardReaderController {
  return {
    publication: {
      slug: 'clear-writing',
      title: 'Clear writing',
      contentLocale: Locale.EN,
      publicationType: ThreadPublicationType.ARTICLE,
      content: {
        markdown: 'Body text',
        citations: [{ url: 'https://example.com/a' }, { url: 'javascript:alert(1)' }],
      },
      publishedAt: '2026-10-05T12:00:00.000Z',
      viewCount: 12,
      readerCount: 3,
    },
    comments: [],
    highlightedCommentId: null,
    commentMissing: false,
    commentTotal: 0,
    hasMoreComments: false,
    isLoadingMoreComments: false,
    loadMoreComments: vi.fn(),
    reactions: { likes: 4, dislikes: 1, viewerReaction: ThreadPublicationReaction.Like },
    isAuthenticated: true,
    isLoading: false,
    isNotFound: false,
    isError: false,
    communityLoading: false,
    communityError: false,
    loginHref: '/login',
    boardHref: '/en/board?q=vector&lang=all',
    publicUrl: 'https://claw.local/threads/clear-writing',
    publicPath: '/threads/clear-writing',
    actions: createActions(),
    goBack: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

describe('BoardReaderView', () => {
  it('shows a skeleton while loading', () => {
    render(<BoardReaderView state={createState({ isLoading: true, publication: undefined })} />);
    expect(screen.getByTestId('board-reader-skeleton')).toBeInTheDocument();
  });

  it('shows a friendly not-found state with a link back to the Board', () => {
    render(<BoardReaderView state={createState({ isNotFound: true, publication: undefined })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadPublicUnavailable');
    expect(screen.getByRole('link', { name: 'chat.threadBoardBack' })).toHaveAttribute(
      'href',
      '/board',
    );
  });

  it('offers a retry on a load error', async () => {
    const state = createState({ isError: true, publication: undefined });
    render(<BoardReaderView state={state} />);
    await userEvent.click(screen.getByRole('button', { name: 'chat.threadBoardRetry' }));
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it('renders breadcrumb, article, safe sources and the viewer reaction', () => {
    render(<BoardReaderView state={createState()} />);
    expect(screen.getByRole('link', { name: 'chat.threadBoardNavLabel' })).toHaveAttribute(
      'href',
      '/en/board?q=vector&lang=all',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Clear writing' })).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
    expect(screen.getByText('chat.threadBoardSources:1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/a' })).toBeInTheDocument();
    expect(screen.queryByText('javascript:alert(1)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat.threadPublicLike/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('has no nested main landmark and renders the share icon row', () => {
    render(<BoardReaderView state={createState({ publicUrl: 'https://claw.local/threads/x' })} />);
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    const row = screen.getByTestId('board-reader-share-links');
    expect(row.querySelectorAll('a[target="_blank"]').length).toBeGreaterThanOrEqual(6);
  });

  it('goes back through the controller', () => {
    const state = createState();
    render(<BoardReaderView state={state} />);
    fireEvent.click(screen.getByRole('button', { name: 'chat.threadBoardBack' }));
    expect(state.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('BoardReaderActions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const props = {
    title: 'Clear writing',
    publicUrl: 'https://claw.local/threads/clear-writing',
    publicPath: '/threads/clear-writing',
    likeCount: 4,
    commentCount: 2,
    viewCount: 12,
  };

  it('shows the counts and opens the canonical public page in a new tab', () => {
    render(<BoardReaderActions {...props} />);
    expect(screen.getByText('chat.threadBoardLikes:4')).toBeInTheDocument();
    expect(screen.getByText('chat.threadBoardComments:2')).toBeInTheDocument();
    expect(screen.getByText('chat.threadBoardViews:12')).toBeInTheDocument();
    const open = screen.getByRole('link', { name: 'chat.threadBoardOpenPublic' });
    expect(open).toHaveAttribute('href', '/threads/clear-writing');
    expect(open).toHaveAttribute('target', '_blank');
  });

  it('copies the canonical public link, not the board address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<BoardReaderActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'chat.threadBoardCopyLink' }));
    expect(await screen.findByText('chat.threadShareCopied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('https://claw.local/threads/clear-writing');
  });

  it('shows the native share button only when the browser supports it', () => {
    vi.stubGlobal('navigator', { share: vi.fn() });
    render(<BoardReaderActions {...props} />);
    expect(screen.getByRole('button', { name: 'chat.threadShareNative' })).toBeInTheDocument();
  });

  it('disables copying until the public address is known', () => {
    render(<BoardReaderActions {...props} publicUrl={null} />);
    expect(screen.getByRole('button', { name: 'chat.threadBoardCopyLink' })).toBeDisabled();
  });

  it('sets lang and dir on the article from the content locale (RTL on an LTR UI)', () => {
    const base = createState();
    const publication = base.publication;
    if (!publication) {
      throw new Error('publication missing');
    }
    render(
      <BoardReaderView
        state={{ ...base, publication: { ...publication, contentLocale: Locale.AR } }}
      />,
    );
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('dir', 'rtl');
    expect(article).toHaveAttribute('lang', 'ar');
  });

  it('keeps an English article left-to-right', () => {
    render(<BoardReaderView state={createState()} />);
    expect(screen.getByRole('article')).toHaveAttribute('dir', 'ltr');
  });
});
