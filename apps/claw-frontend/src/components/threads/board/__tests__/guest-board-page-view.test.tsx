import { ThreadPublicationType } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { threadBoardGuestRepository } from '@/repositories/threads/thread-board-guest.repository';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import type {
  ThreadBoardItem,
  ThreadBoardListResponse,
  ThreadBoardState,
} from '@/types/thread-board.types';

import { GuestBoardPageView } from '../guest-board-page-view';

const push = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/threads/board',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('../board-filters-sheet-lazy', () => ({ LazyBoardFiltersSheet: () => null }));
vi.mock('@/repositories/threads/thread-board-guest.repository', () => ({
  threadBoardGuestRepository: { list: vi.fn(), suggest: vi.fn() },
}));
vi.mock('@/repositories/threads/thread-board.repository', () => ({
  threadBoardRepository: { list: vi.fn(), suggest: vi.fn() },
}));

function item(slug: string): ThreadBoardItem {
  return {
    slug,
    title: `Title ${slug}`,
    excerpt: `Excerpt ${slug}`,
    contentLocale: 'en',
    publicationType: ThreadPublicationType.GUIDE,
    publishedAt: '2026-10-01T00:00:00.000Z',
    readingMinutes: 4,
    sourceCount: 2,
    likeCount: 11,
    commentCount: 3,
    viewCount: 90,
    viewerReaction: null,
  };
}

const STATE: ThreadBoardState = {
  q: '',
  sort: ThreadBoardSort.Latest,
  lang: ThreadBoardAllFilter.All,
  type: ThreadBoardAllFilter.All,
  page: 1,
};

function response(slugs: string[], totalPages = 1): ThreadBoardListResponse {
  return {
    items: slugs.map(item),
    meta: { total: slugs.length, page: 1, limit: 12, totalPages },
    didYouMean: null,
  };
}

function renderBoard(initial?: ThreadBoardListResponse) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GuestBoardPageView initial={initial ? { state: STATE, data: initial } : undefined} />
    </QueryClientProvider>,
  );
}

describe('GuestBoardPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = '';
  });

  it('renders the server-provided first page with no request and no account', () => {
    renderBoard(response(['alpha', 'beta']));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'chat.threadPublicBoardTitle',
    );
    expect(screen.getByText('Title alpha')).toBeInTheDocument();
    expect(screen.getByText('Title beta')).toBeInTheDocument();
    expect(threadBoardGuestRepository.list).not.toHaveBeenCalled();
    expect(threadBoardRepository.list).not.toHaveBeenCalled();
  });

  it('links every card to the public Thread page, never to the in-app Board', () => {
    renderBoard(response(['alpha', 'beta']));

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '');
    expect(hrefs).toContain('/en/threads/alpha');
    expect(hrefs).toContain('/en/threads/beta');
    expect(hrefs.some((href) => href.startsWith('/board') || href.includes('/board/'))).toBe(false);
  });

  it('shows like, comment and view counts as plain numbers', () => {
    renderBoard(response(['alpha']));

    const card = screen.getByTestId('board-card');
    expect(within(card).getByText('chat.threadBoardLikes|11')).toBeInTheDocument();
    expect(within(card).getByText('chat.threadBoardComments|3')).toBeInTheDocument();
    expect(within(card).getByText('chat.threadBoardViews|90')).toBeInTheDocument();
  });

  it('is read-only: a sign-in banner with sign-in and sign-up links, and no action buttons', () => {
    renderBoard(response(['alpha']));

    const banner = screen.getByTestId('board-guest-banner');
    expect(within(banner).getByRole('link', { name: /threadBoardGuestSignIn/u })).toHaveAttribute(
      'href',
      '/en/login?returnTo=%2Fthreads%2Fboard',
    );
    expect(within(banner).getByRole('link', { name: /threadBoardGuestRegister/u })).toHaveAttribute(
      'href',
      '/en/register?returnTo=%2Fthreads%2Fboard',
    );
    expect(screen.queryByRole('button', { name: /like|comment|bookmark|report/iu })).toBeNull();
  });

  it('keeps the filter state in the sign-in return link', () => {
    search = 'q=rag&page=2';
    renderBoard(response(['alpha']));

    const banner = screen.getByTestId('board-guest-banner');
    expect(within(banner).getByRole('link', { name: /threadBoardGuestSignIn/u })).toHaveAttribute(
      'href',
      `/en/login?returnTo=${encodeURIComponent('/threads/board?q=rag&page=2')}`,
    );
  });

  it('exposes no author, owner or viewer fields', () => {
    const { container } = renderBoard(response(['alpha']));

    expect(container.textContent).not.toMatch(/ownerId|authorId|viewerReaction|hash|safety/iu);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="board-card"] [data-author]')).toBeNull();
  });

  it('loads the first page itself through the public repository when the server had none', async () => {
    vi.mocked(threadBoardGuestRepository.list).mockResolvedValue(response(['gamma']));

    renderBoard();

    expect(screen.getByTestId('board-skeleton')).toBeInTheDocument();
    expect(await screen.findByText('Title gamma')).toBeInTheDocument();
    expect(threadBoardGuestRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'all', page: 1, limit: 12 }),
      expect.anything(),
    );
    expect(threadBoardRepository.list).not.toHaveBeenCalled();
  });

  it('shows a retryable error, not an empty Board, when the list cannot load', async () => {
    vi.mocked(threadBoardGuestRepository.list).mockRejectedValue(new Error('down'));

    renderBoard();

    // The list retries twice with back-off before it gives up.
    expect(
      await screen.findByText('chat.threadBoardErrorTitle', undefined, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chat.threadBoardRetry' })).toBeInTheDocument();
    expect(screen.queryByText('chat.threadBoardEmptyTitle')).toBeNull();
  }, 15_000);

  it('shows the empty state when there are no public Threads', () => {
    renderBoard(response([]));

    expect(screen.getByText('chat.threadBoardEmptyTitle')).toBeInTheDocument();
  });

  it('paginates through the URL', async () => {
    const user = userEvent.setup();
    renderBoard(response(['alpha'], 3));

    await user.click(screen.getByRole('button', { name: /2/u }));

    expect(push).toHaveBeenCalledWith('/en/threads/board?page=2');
  });

  it('searches through the public suggest endpoint and opens the chosen Thread publicly', async () => {
    const user = userEvent.setup();
    vi.mocked(threadBoardGuestRepository.suggest).mockResolvedValue({
      suggestions: [
        {
          slug: 'rag-guide',
          title: 'RAG guide',
          publicationType: ThreadPublicationType.GUIDE,
          contentLocale: 'en',
          publishedAt: '2026-10-01T00:00:00.000Z',
          match: [[0, 3]],
        },
      ],
      didYouMean: null,
      total: 14,
      totalCapped: false,
    });
    renderBoard(response(['alpha']));

    await user.type(screen.getByRole('combobox', { name: 'chat.threadBoardSearchLabel' }), 'rag');
    const [option] = await screen.findAllByRole('option');
    expect(option).toHaveTextContent('RAG guide');
    await waitFor(() => expect(threadBoardGuestRepository.suggest).toHaveBeenCalled());
    expect(threadBoardRepository.suggest).not.toHaveBeenCalled();
    expect(screen.getByText(/chat\.threadBoardShowAll/u)).toBeInTheDocument();

    if (option) {
      await user.click(option);
    }

    expect(push).toHaveBeenCalledWith('/en/threads/rag-guide');
  });

  it('submits a search to the URL so the full result list can be shared', async () => {
    const user = userEvent.setup();
    renderBoard(response(['alpha']));

    await user.type(
      screen.getByRole('combobox', { name: 'chat.threadBoardSearchLabel' }),
      'rag{Enter}',
    );

    expect(push).toHaveBeenCalledWith('/en/threads/board?q=rag');
  });
});
