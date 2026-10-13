import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { THREAD_BOARD_ALL, THREAD_BOARD_DEFAULT_SORT } from '@/constants/thread-board.constants';
import { useLocale } from '@/hooks/use-locale';
import type { ThreadBoardState, UseBoardQueryStateResult } from '@/types/thread-board.types';
import {
  clampBoardPage,
  hasActiveBoardFilters,
  parseBoardUrlState,
  serialiseBoardUrlState,
} from '@/utilities/thread-board-url-state.utility';

/** The URL is the only state: every setter rewrites it; filter changes reset page to 1. */
export function useBoardQueryState(): UseBoardQueryStateResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const defaultLang: string = locale;
  const paramsKey = searchParams.toString();

  const state = useMemo(
    () => parseBoardUrlState(new URLSearchParams(paramsKey), defaultLang),
    [paramsKey, defaultLang],
  );

  const commit = useCallback(
    (next: ThreadBoardState) => {
      const query = serialiseBoardUrlState(next, defaultLang);
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, defaultLang],
  );

  const setQuery = useCallback((q: string) => commit({ ...state, q, page: 1 }), [commit, state]);
  const setSort = useCallback(
    (sort: ThreadBoardState['sort']) => commit({ ...state, sort, page: 1 }),
    [commit, state],
  );
  const setLanguage = useCallback(
    (lang: string) => commit({ ...state, lang, page: 1 }),
    [commit, state],
  );
  const setType = useCallback(
    (type: ThreadBoardState['type']) => commit({ ...state, type, page: 1 }),
    [commit, state],
  );
  const setPage = useCallback(
    (page: number) => commit({ ...state, page: clampBoardPage(page) }),
    [commit, state],
  );
  const clearFilters = useCallback(
    () =>
      commit({
        q: '',
        sort: THREAD_BOARD_DEFAULT_SORT,
        lang: defaultLang,
        type: THREAD_BOARD_ALL,
        page: 1,
      }),
    [commit, defaultLang],
  );

  return {
    state,
    setQuery,
    setSort,
    setLanguage,
    setType,
    setPage,
    clearFilters,
    hasActiveFilters: hasActiveBoardFilters(state, defaultLang),
  };
}
