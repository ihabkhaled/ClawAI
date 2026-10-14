import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { BoardModeContext } from '@/lib/threads/board-mode-context';
import { threadBoardGuestRepository } from '@/repositories/threads/thread-board-guest.repository';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import type { ThreadBoardListResponse, ThreadBoardState } from '@/types/thread-board.types';

import { useBoardGuestLinks } from '../use-board-guest-links';
import { useBoardItemHref } from '../use-board-item-href';
import { useBoardList } from '../use-board-list';
import { useBoardMode } from '../use-board-mode';
import { useBoardQueryState } from '../use-board-query-state';

const push = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/fr/threads/board',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'fr' }),
}));
vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'fr' }) }));
vi.mock('@/repositories/threads/thread-board-guest.repository', () => ({
  threadBoardGuestRepository: { list: vi.fn(), suggest: vi.fn() },
}));
vi.mock('@/repositories/threads/thread-board.repository', () => ({
  threadBoardRepository: { list: vi.fn(), suggest: vi.fn() },
}));

const EMPTY: ThreadBoardListResponse = {
  items: [],
  meta: { total: 0, page: 1, limit: 12, totalPages: 1 },
  didYouMean: null,
};
const STATE: ThreadBoardState = {
  q: '',
  sort: ThreadBoardSort.Latest,
  lang: ThreadBoardAllFilter.All,
  type: ThreadBoardAllFilter.All,
  page: 1,
};

function wrapperFor(mode: ThreadBoardMode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <BoardModeContext.Provider value={mode}>{children}</BoardModeContext.Provider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
  vi.mocked(threadBoardGuestRepository.list).mockResolvedValue(EMPTY);
  vi.mocked(threadBoardRepository.list).mockResolvedValue(EMPTY);
});

describe('useBoardMode', () => {
  it('is the member Board unless a provider says otherwise', () => {
    expect(renderHook(() => useBoardMode()).result.current).toBe(ThreadBoardMode.Member);
    expect(
      renderHook(() => useBoardMode(), { wrapper: wrapperFor(ThreadBoardMode.Guest) }).result
        .current,
    ).toBe(ThreadBoardMode.Guest);
  });
});

describe('useBoardList by mode', () => {
  it('loads a guest list through the public repository only', async () => {
    const { result } = renderHook(() => useBoardList(STATE), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(threadBoardGuestRepository.list).toHaveBeenCalledTimes(1);
    expect(threadBoardRepository.list).not.toHaveBeenCalled();
  });

  it('loads a member list through the account repository only', async () => {
    const { result } = renderHook(() => useBoardList(STATE), {
      wrapper: wrapperFor(ThreadBoardMode.Member),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(threadBoardRepository.list).toHaveBeenCalledTimes(1);
    expect(threadBoardGuestRepository.list).not.toHaveBeenCalled();
  });

  it('uses the server-rendered page while the URL still matches it, without a request', () => {
    const { result } = renderHook(() => useBoardList(STATE, { state: STATE, data: EMPTY }), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });

    expect(result.current.data).toEqual(EMPTY);
    expect(threadBoardGuestRepository.list).not.toHaveBeenCalled();
  });

  it('fetches normally once the URL no longer matches the server-rendered page', async () => {
    const other: ThreadBoardState = { ...STATE, page: 2 };
    const { result } = renderHook(() => useBoardList(other, { state: STATE, data: EMPTY }), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(threadBoardGuestRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    );
  });
});

describe('useBoardQueryState by mode', () => {
  it('starts a guest on every language and a member on their own', () => {
    const guest = renderHook(() => useBoardQueryState(), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });
    const member = renderHook(() => useBoardQueryState(), {
      wrapper: wrapperFor(ThreadBoardMode.Member),
    });

    expect(guest.result.current.state.lang).toBe('all');
    expect(guest.result.current.hasActiveFilters).toBe(false);
    expect(member.result.current.state.lang).toBe('fr');
  });

  it('keeps a guest filter in the URL and leaves the default out of it', () => {
    const { result } = renderHook(() => useBoardQueryState(), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });

    result.current.setLanguage('fr');
    expect(push).toHaveBeenLastCalledWith('/fr/threads/board?lang=fr');
    result.current.setQuery('rag');
    expect(push).toHaveBeenLastCalledWith('/fr/threads/board?q=rag');
  });
});

describe('useBoardItemHref', () => {
  it('opens the public Thread page in the visitor language for a guest', () => {
    const { result } = renderHook(() => useBoardItemHref(), {
      wrapper: wrapperFor(ThreadBoardMode.Guest),
    });
    expect(result.current('a-slug')).toBe('/fr/threads/a-slug');
  });

  it('opens the in-app reader for a member', () => {
    const { result } = renderHook(() => useBoardItemHref(), {
      wrapper: wrapperFor(ThreadBoardMode.Member),
    });
    expect(result.current('a-slug')).toBe('/board/a-slug');
  });
});

describe('useBoardGuestLinks', () => {
  it('returns the guest to the exact Board view, without the language prefix', () => {
    search = 'q=rag&lang=en';
    const { result } = renderHook(() => useBoardGuestLinks());

    const target = encodeURIComponent('/threads/board?q=rag&lang=en');
    expect(result.current.signInHref).toBe(`/login?returnTo=${target}`);
    expect(result.current.registerHref).toBe(`/register?returnTo=${target}`);
  });
});
