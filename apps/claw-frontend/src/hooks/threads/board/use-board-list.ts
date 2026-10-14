import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  THREAD_BOARD_DEFAULT_PAGE_SIZE,
  THREAD_BOARD_LIST_STALE_MS,
  THREAD_BOARD_QUERY_KEY,
} from '@/constants/thread-board.constants';
import { useBoardMode } from '@/hooks/threads/board/use-board-mode';
import { getThreadBoardRepository } from '@/repositories/threads/thread-board-source';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  ThreadBoardInitialList,
  ThreadBoardListResponse,
  ThreadBoardState,
} from '@/types/thread-board.types';
import { isSameBoardState } from '@/utilities/thread-board-url-state.utility';

/**
 * `initial` is the page the server already rendered. It seeds the query only while the URL still
 * matches it, so the first paint needs no request and a later filter change fetches normally.
 */
export function useBoardList(state: ThreadBoardState, initial?: ThreadBoardInitialList) {
  const mode = useBoardMode();
  const repository = getThreadBoardRepository(mode);
  const seed = initial && isSameBoardState(initial.state, state) ? initial.data : undefined;
  return useQuery<ThreadBoardListResponse>({
    queryKey: [THREAD_BOARD_QUERY_KEY, mode, 'list', state],
    queryFn: ({ signal }) =>
      repository.list({ ...state, limit: THREAD_BOARD_DEFAULT_PAGE_SIZE }, { signal }),
    initialData: seed,
    placeholderData: keepPreviousData,
    staleTime: THREAD_BOARD_LIST_STALE_MS,
    // A 429 will not clear by retrying at once; show the wait state instead.
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status === 429) && count < 2,
  });
}
