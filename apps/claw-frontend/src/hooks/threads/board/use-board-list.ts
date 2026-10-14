import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  THREAD_BOARD_DEFAULT_PAGE_SIZE,
  THREAD_BOARD_LIST_STALE_MS,
  THREAD_BOARD_QUERY_KEY,
} from '@/constants/thread-board.constants';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadBoardListResponse, ThreadBoardState } from '@/types/thread-board.types';

export function useBoardList(state: ThreadBoardState) {
  return useQuery<ThreadBoardListResponse>({
    queryKey: [THREAD_BOARD_QUERY_KEY, 'list', state],
    queryFn: ({ signal }) =>
      threadBoardRepository.list({ ...state, limit: THREAD_BOARD_DEFAULT_PAGE_SIZE }, { signal }),
    placeholderData: keepPreviousData,
    staleTime: THREAD_BOARD_LIST_STALE_MS,
    // A 429 will not clear by retrying at once; show the wait state instead.
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status === 429) && count < 2,
  });
}
