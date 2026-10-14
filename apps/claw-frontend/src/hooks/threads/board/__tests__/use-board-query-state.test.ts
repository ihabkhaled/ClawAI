import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';

import { useBoardQueryState } from '../use-board-query-state';

const push = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/board',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

beforeEach(() => {
  push.mockClear();
  search = '';
});

describe('useBoardQueryState', () => {
  it('parses the URL with the UI locale as default language', () => {
    search = 'q=rag&sort=liked&page=3';
    const { result } = renderHook(() => useBoardQueryState());
    expect(result.current.state).toEqual({
      q: 'rag',
      sort: ThreadBoardSort.Liked,
      lang: 'en',
      type: ThreadBoardAllFilter.All,
      page: 3,
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('setSort resets the page and rewrites the URL', () => {
    search = 'page=3';
    const { result } = renderHook(() => useBoardQueryState());
    result.current.setSort(ThreadBoardSort.Trending);
    expect(push).toHaveBeenCalledWith('/board?sort=trending');
  });

  it('setLanguage all writes lang=all', () => {
    const { result } = renderHook(() => useBoardQueryState());
    result.current.setLanguage('all');
    expect(push).toHaveBeenCalledWith('/board?lang=all');
  });

  it('setPage clamps', () => {
    const { result } = renderHook(() => useBoardQueryState());
    result.current.setPage(-4);
    expect(push).toHaveBeenCalledWith('/board');
    result.current.setPage(2);
    expect(push).toHaveBeenLastCalledWith('/board?page=2');
  });

  it('clearFilters returns to the bare path', () => {
    search = 'q=x&type=guide&lang=all&sort=liked';
    const { result } = renderHook(() => useBoardQueryState());
    result.current.clearFilters();
    expect(push).toHaveBeenCalledWith('/board');
  });
});
