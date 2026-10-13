import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  THREAD_BOARD_QUERY_KEY,
  THREAD_BOARD_SUGGEST_DEBOUNCE_MS,
  THREAD_BOARD_SUGGEST_MIN_CHARS,
  THREAD_BOARD_SUGGEST_STALE_MS,
} from '@/constants/thread-board.constants';
import { useLocale } from '@/hooks/use-locale';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import type { UseBoardSuggestResult } from '@/types/thread-board.types';

export function useBoardSuggest(rawQuery: string): UseBoardSuggestResult {
  const { locale } = useLocale();
  const [debounced, setDebounced] = useState(rawQuery.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(rawQuery.trim()), THREAD_BOARD_SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const enabled = debounced.length >= THREAD_BOARD_SUGGEST_MIN_CHARS;
  const query = useQuery({
    queryKey: [THREAD_BOARD_QUERY_KEY, 'suggest', locale, debounced],
    queryFn: ({ signal }) => threadBoardRepository.suggest(debounced, locale, { signal }),
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
