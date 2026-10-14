import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  ThreadBoardListParams,
  ThreadBoardListResponse,
  ThreadBoardSuggestResponse,
} from '@/types/thread-board.types';
import { buildBoardListQuery } from '@/utilities/thread-board-query.utility';

type RequestOptions = { signal?: AbortSignal };

export const threadBoardRepository = {
  async list(
    params: ThreadBoardListParams,
    options?: RequestOptions,
  ): Promise<ThreadBoardListResponse> {
    const response = await apiClient.get<ThreadBoardListResponse>(
      '/thread-publications/board',
      buildBoardListQuery(params),
      options,
    );
    return response.data;
  },
  async suggest(
    q: string,
    lang: string,
    options?: RequestOptions,
  ): Promise<ThreadBoardSuggestResponse> {
    const response = await apiClient.get<ThreadBoardSuggestResponse>(
      '/thread-publications/board/suggest',
      { q, lang: lang || THREAD_BOARD_ALL },
      options,
    );
    return response.data;
  },
};
