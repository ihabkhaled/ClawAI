import type { QueryClient } from '@tanstack/react-query';

import { THREAD_BOARD_QUERY_KEY } from '@/constants/thread-board.constants';

/** Invalidates every cached board list and suggestion query. */
export function invalidateThreadBoard(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [THREAD_BOARD_QUERY_KEY] });
}
