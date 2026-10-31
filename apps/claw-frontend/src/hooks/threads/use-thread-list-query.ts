import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  THREAD_LIST_PAGE_SIZE,
  THREAD_LIST_QUERY_KEY_BASE,
} from '@/constants/thread-list.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadListUrlState } from '@/types/thread-list.types';

/** One page of the owner's Threads. The previous page stays on screen while the next loads. */
export function useThreadListQuery(state: ThreadListUrlState) {
  return useQuery({
    queryKey: [...THREAD_LIST_QUERY_KEY_BASE, 'page', state.q, state.status, state.page],
    queryFn: () =>
      threadPublicationsRepository.listMinePage({ ...state, pageSize: THREAD_LIST_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}
