import { ThreadPublicationType } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadBoardItem, ThreadBoardState } from '@/types/thread-board.types';

import { BoardPageView } from '../board-page-view';

const setters = {
  setQuery: vi.fn(),
  setSort: vi.fn(),
  setLanguage: vi.fn(),
  setType: vi.fn(),
  setPage: vi.fn(),
  clearFilters: vi.fn(),
};
const refetch = vi.fn();
let state: ThreadBoardState;
let hasActiveFilters = false;
let list: {
  data?: { items: ThreadBoardItem[]; meta: object; didYouMean: string | null };
  isLoading: boolean;
  isError: boolean;
  error?: Error;
};

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/board',
  useSearchParams: () => new URLSearchParams('q=ai&page=2'),
}));
vi.mock('@/hooks/threads/board/use-board-query-state', () => ({
  useBoardQueryState: () => ({ state, hasActiveFilters, ...setters }),
}));
vi.mock('@/hooks/threads/board/use-board-list', () => ({
  useBoardList: () => ({ ...list, refetch }),
}));
vi.mock('../board-search-combobox', () => ({
  BoardSearchCombobox: ({ value, onSubmit }: { value: string; onSubmit: (q: string) => void }) => (
    <button type="button" data-testid="search" onClick={() => onSubmit(`${value}x`)} />
  ),
}));
vi.mock('../board-did-you-mean', () => ({
  BoardDidYouMean: ({ term, onSelect }: { term: string; onSelect: () => void }) => (
    <button type="button" data-testid="dym" onClick={onSelect}>
      {term}
    </button>
  ),
}));
vi.mock('../board-filters-sheet-lazy', () => ({ LazyBoardFiltersSheet: () => null }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function item(slug: string): ThreadBoardItem {
  return {
    slug,
    title: `Title ${slug}`,
    excerpt: 'An excerpt',
    contentLocale: 'en',
    publicationType: ThreadPublicationType.ARTICLE,
    publishedAt: '2026-10-01T00:00:00Z',
    readingMinutes: 4,
    sourceCount: 2,
    likeCount: 5,
    commentCount: 1,
    viewCount: 9,
    viewerReaction: null,
  };
}

describe('BoardPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state = {
      q: '',
      sort: ThreadBoardSort.Latest,
      lang: 'all',
      type: ThreadBoardAllFilter.All,
      page: 1,
    };
    hasActiveFilters = false;
    list = { isLoading: false, isError: false };
  });

  it('shows skeletons while loading', () => {
    list = { isLoading: true, isError: false };
    render(<BoardPageView />);
    expect(screen.getByTestId('board-skeleton')).toBeInTheDocument();
  });

  it('shows an error with a working Retry', () => {
    list = { isLoading: false, isError: true };
    render(<BoardPageView />);
    fireEvent.click(screen.getByText('chat.threadBoardRetry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a wait state with the Retry-After seconds on a 429', () => {
    list = {
      isLoading: false,
      isError: true,
      error: new ApiClientError({ message: 'Too many', status: 429, retryAfterSeconds: 54 }),
    };
    render(<BoardPageView />);
    expect(screen.getByTestId('board-rate-limited')).toHaveTextContent(
      'chat.threadBoardRateLimitWait:{"seconds":54}',
    );
    expect(screen.queryByText('chat.threadBoardErrorTitle')).not.toBeInTheDocument();
  });

  it('remembers the exact board URL so the reader can return to it', () => {
    render(<BoardPageView />);
    expect(window.sessionStorage.getItem('thread-board:list-url')).toBe('/en/board?q=ai&page=2');
  });

  it('shows the plain empty state without filters', () => {
    list = {
      isLoading: false,
      isError: false,
      data: { items: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 }, didYouMean: null },
    };
    render(<BoardPageView />);
    expect(screen.getByText('chat.threadBoardEmptyBody')).toBeInTheDocument();
    expect(screen.queryByText('chat.threadBoardClearFilters')).not.toBeInTheDocument();
  });

  it('offers clear in the filtered empty state', () => {
    state = { ...state, q: 'zzz' };
    hasActiveFilters = true;
    list = {
      isLoading: false,
      isError: false,
      data: { items: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 }, didYouMean: null },
    };
    render(<BoardPageView />);
    expect(screen.getByText('chat.threadBoardEmptySearch:{"query":"zzz"}')).toBeInTheDocument();
    const [clearButton] = screen.getAllByText('chat.threadBoardClearFilters');
    if (!clearButton) {
      throw new Error('Clear filters control missing');
    }
    fireEvent.click(clearButton);
    expect(setters.clearFilters).toHaveBeenCalled();
  });

  it('renders cards linking to the reader, with the count', () => {
    list = {
      isLoading: false,
      isError: false,
      data: {
        items: [item('a'), item('b')],
        meta: { total: 2, page: 1, limit: 12, totalPages: 1 },
        didYouMean: null,
      },
    };
    render(<BoardPageView />);
    expect(screen.getAllByTestId('board-card')).toHaveLength(2);
    expect(screen.getByText('Title a').closest('a')).toHaveAttribute('href', '/board/a');
    expect(screen.getByTestId('board-count')).toHaveTextContent('"count":2');
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('shows chips for active filters and removes one', () => {
    state = { ...state, q: 'ai', lang: 'de' };
    hasActiveFilters = true;
    list = {
      isLoading: false,
      isError: false,
      data: {
        items: [item('a')],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
        didYouMean: null,
      },
    };
    render(<BoardPageView />);
    fireEvent.click(screen.getByLabelText(/"ai"/));
    expect(setters.setQuery).toHaveBeenCalledWith('');
    fireEvent.click(screen.getByLabelText(/Deutsch/));
    expect(setters.setLanguage).toHaveBeenCalledWith('all');
  });

  it('binds pagination and did-you-mean to the URL setters', () => {
    list = {
      isLoading: false,
      isError: false,
      data: {
        items: [item('a')],
        meta: { total: 30, page: 1, limit: 12, totalPages: 3 },
        didYouMean: 'kubernetes',
      },
    };
    render(<BoardPageView />);
    fireEvent.click(screen.getByTestId('dym'));
    expect(setters.setQuery).toHaveBeenCalledWith('kubernetes');
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('submits a search through the combobox slot', () => {
    list = { isLoading: true, isError: false };
    render(<BoardPageView />);
    fireEvent.click(screen.getByTestId('search'));
    expect(setters.setQuery).toHaveBeenCalledWith('x');
  });
});
