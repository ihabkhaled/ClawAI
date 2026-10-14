import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import type { ThreadBoardListParams } from '@/types/thread-board.types';

/** The query string of a Board list request; shared by the member, guest and server callers. */
export function buildBoardListQuery(params: ThreadBoardListParams): Record<string, string> {
  const query: Record<string, string> = {
    sort: params.sort,
    lang: params.lang || THREAD_BOARD_ALL,
    type: params.type,
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.q) {
    query['q'] = params.q;
  }
  return query;
}
