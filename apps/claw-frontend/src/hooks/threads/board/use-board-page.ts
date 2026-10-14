import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { BoardChipKind } from '@/enums/board-chip-kind.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { useBoardList } from '@/hooks/threads/board/use-board-list';
import { useBoardMode } from '@/hooks/threads/board/use-board-mode';
import { useBoardQueryState } from '@/hooks/threads/board/use-board-query-state';
import { useTranslation } from '@/lib/i18n';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadBoardInitialList } from '@/types/thread-board.types';
import { rememberBoardListUrl } from '@/utilities/thread-board-list-url.utility';
import {
  buildBoardChips,
  countBoardFilters,
  toBoardSort,
  toBoardType,
} from '@/utilities/thread-board-view.utility';

/** Wires URL state, the list query and derived chips for the Board page. */
export function useBoardPage(initial?: ThreadBoardInitialList) {
  const { t } = useTranslation();
  const mode = useBoardMode();
  const query = useBoardQueryState();
  const list = useBoardList(query.state, initial);
  const { state } = query;
  const pathname = usePathname();
  const paramsKey = useSearchParams().toString();

  // The member reader's "Back to Board" returns to this exact view, filters and page included.
  // A guest opens the public Thread page, which has its own plain link back.
  useEffect(() => {
    if (mode === ThreadBoardMode.Member) {
      rememberBoardListUrl(paramsKey ? `${pathname}?${paramsKey}` : pathname);
    }
  }, [mode, pathname, paramsKey]);

  const rateLimit =
    list.error instanceof ApiClientError && list.error.status === 429
      ? { retryAfterSeconds: list.error.retryAfterSeconds ?? null }
      : null;

  const chips = useMemo(
    () => buildBoardChips({ q: state.q, lang: state.lang, type: state.type }, t),
    [state.q, state.lang, state.type, t],
  );

  const removeChip = (kind: BoardChipKind): void => {
    if (kind === BoardChipKind.Query) {
      query.setQuery('');
    } else if (kind === BoardChipKind.Language) {
      query.setLanguage(THREAD_BOARD_ALL);
    } else {
      query.setType(THREAD_BOARD_ALL);
    }
  };

  return {
    state,
    query,
    chips,
    activeFilterCount: countBoardFilters(state),
    removeChip,
    changeSort: (value: string) => query.setSort(toBoardSort(value)),
    changeType: (value: string) => query.setType(toBoardType(value)),
    items: list.data?.items ?? [],
    meta: list.data?.meta ?? null,
    didYouMean: list.data?.didYouMean ?? null,
    isLoading: list.isLoading,
    isError: list.isError,
    rateLimit,
    retry: () => {
      void list.refetch();
    },
  };
}
