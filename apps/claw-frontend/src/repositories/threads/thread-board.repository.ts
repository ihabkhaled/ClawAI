import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  ThreadBoardListParams,
  ThreadBoardListResponse,
  ThreadBoardSuggestResponse,
} from '@/types/thread-board.types';

type RequestOptions = { signal?: AbortSignal };

export const threadBoardRepository = {
  async list(
    params: ThreadBoardListParams,
    options?: RequestOptions,
  ): Promise<ThreadBoardListResponse> {
    const query: Record<string, string> = {
      sort: params.sort,
      lang: params.lang || THREAD_BOARD_ALL,
      type: params.type,
      page: String(params.page),
      limit: String(params.limit),
    };
    if (params.q) {
      query.q = params.q;
    }
    const response = await apiClient.get<ThreadBoardListResponse>(
      '/thread-publications/board',
      query,
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
