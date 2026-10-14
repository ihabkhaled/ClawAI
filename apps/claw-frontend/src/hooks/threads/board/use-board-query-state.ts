import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { THREAD_BOARD_ALL, THREAD_BOARD_DEFAULT_SORT } from '@/constants/thread-board.constants';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { useBoardMode } from '@/hooks/threads/board/use-board-mode';
import { useLocale } from '@/hooks/use-locale';
import type { ThreadBoardState, UseBoardQueryStateResult } from '@/types/thread-board.types';
import {
  clampBoardPage,
  hasActiveBoardFilters,
  parseBoardUrlState,
  serialiseBoardUrlState,
} from '@/utilities/thread-board-url-state.utility';

/**
 * The URL is the only state: every setter pushes a history entry (so Back restores the previous
 * view); filter changes reset page to 1. The search box only commits on submit, never per key.
 */
export function useBoardQueryState(): UseBoardQueryStateResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const mode = useBoardMode();
  // Members start in their own language; guests start with every language, so the first view is
  // the whole Board and the language filter narrows it.
  const defaultLang: string = mode === ThreadBoardMode.Guest ? THREAD_BOARD_ALL : locale;
  const paramsKey = searchParams.toString();

  const state = useMemo(
    () => parseBoardUrlState(new URLSearchParams(paramsKey), defaultLang),
    [paramsKey, defaultLang],
  );

  const commit = useCallback(
    (next: ThreadBoardState) => {
      const query = serialiseBoardUrlState(next, defaultLang);
      router.push(query ? `${pathname}?${query}` : pathname);
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
