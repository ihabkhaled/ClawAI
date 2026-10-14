import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  THREAD_BOARD_QUERY_KEY,
  THREAD_BOARD_SUGGEST_DEBOUNCE_MS,
  THREAD_BOARD_SUGGEST_MIN_CHARS,
  THREAD_BOARD_SUGGEST_STALE_MS,
} from '@/constants/thread-board.constants';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import type { UseBoardSuggestResult } from '@/types/thread-board.types';
import { normalizeSuggestQuery } from '@/utilities/thread-board-suggest-query.utility';

/** `lang` is the board's active language filter (or `all`), never the UI locale. */
export function useBoardSuggest(rawQuery: string, lang: string): UseBoardSuggestResult {
  const [debounced, setDebounced] = useState(normalizeSuggestQuery(rawQuery));

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(normalizeSuggestQuery(rawQuery)),
      THREAD_BOARD_SUGGEST_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const enabled = debounced.length >= THREAD_BOARD_SUGGEST_MIN_CHARS;
  const query = useQuery({
    queryKey: [THREAD_BOARD_QUERY_KEY, 'suggest', lang, debounced],
    queryFn: ({ signal }) => threadBoardRepository.suggest(debounced, lang, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: THREAD_BOARD_SUGGEST_STALE_MS,
    retry: false,
  });

  const data = enabled ? query.data : undefined;
  return {
    suggestions: data?.suggestions ?? [],
    didYouMean: data?.didYouMean ?? null,
    total: data?.total ?? 0,
    totalCapped: data?.totalCapped ?? false,
    isLoading: enabled && query.isFetching,
    isError: enabled && query.isError,
  };
}
