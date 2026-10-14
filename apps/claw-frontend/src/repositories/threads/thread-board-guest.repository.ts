import {
  THREAD_BOARD_PUBLIC_API_PATH,
  THREAD_BOARD_PUBLIC_SUGGEST_API_PATH,
} from '@/constants/thread-board-guest.constants';
import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  ThreadBoardListParams,
  ThreadBoardListResponse,
  ThreadBoardSuggestResponse,
} from '@/types/thread-board.types';
import { toPublicBoardList, toPublicBoardSuggest } from '@/utilities/thread-board-public.utility';
import { buildBoardListQuery } from '@/utilities/thread-board-query.utility';

type RequestOptions = { signal?: AbortSignal };

/**
 * The guest Board: the public `/public/board` endpoints, no account. Every response is reduced to
 * the public fields before it reaches a component. An unreadable body is an error, never an
 * empty Board, so a broken server is not shown as "no Threads yet".
 */
export const threadBoardGuestRepository = {
  async list(
    params: ThreadBoardListParams,
    options?: RequestOptions,
  ): Promise<ThreadBoardListResponse> {
    const response = await apiClient.get<unknown>(
      THREAD_BOARD_PUBLIC_API_PATH,
      buildBoardListQuery(params),
      options,
    );
    const list = toPublicBoardList(response.data);
    if (list === null) {
      throw new Error('The public Board returned an unreadable list.');
    }
    return list;
  },
  async suggest(
    q: string,
    lang: string,
    options?: RequestOptions,
  ): Promise<ThreadBoardSuggestResponse> {
    const response = await apiClient.get<unknown>(
      THREAD_BOARD_PUBLIC_SUGGEST_API_PATH,
      { q, lang: lang || THREAD_BOARD_ALL },
      options,
    );
    const suggest = toPublicBoardSuggest(response.data);
    if (suggest === null) {
      throw new Error('The public Board returned unreadable suggestions.');
    }
    return suggest;
  },
};
