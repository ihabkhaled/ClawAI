import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';

import { ThreadListNavigateMode } from '@/enums/thread-list-navigate-mode.enum';
import type { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { useThreadListDelete } from '@/hooks/threads/use-thread-list-delete';
import { useThreadListFocus } from '@/hooks/threads/use-thread-list-focus';
import { useThreadListPublish } from '@/hooks/threads/use-thread-list-publish';
import { useThreadListQuery } from '@/hooks/threads/use-thread-list-query';
import { useThreadListSearch } from '@/hooks/threads/use-thread-list-search';
import { useThreadListUrlState } from '@/hooks/threads/use-thread-list-url-state';
import type { ThreadListController } from '@/types/thread-list.types';
import {
  DEFAULT_THREAD_LIST_STATE,
  pageAfterDelete,
} from '@/utilities/thread-list-url-state.utility';

/** Everything the Threads list page needs: URL state, the page of rows, publish and delete. */
export function useThreadList(headingRef: RefObject<HTMLElement | null>): ThreadListController {
  const { state, navigate } = useThreadListUrlState();
  const query = useThreadListQuery(state);
  const rowsOnPage = query.data?.items.length ?? 0;

  const commitSearch = useCallback(
    (q: string) => navigate({ ...state, q, page: 1 }, ThreadListNavigateMode.REPLACE),
    [navigate, state],
  );
  const search = useThreadListSearch(state.q, commitSearch);
  const publish = useThreadListPublish();
  const deletion = useThreadListDelete(
    () => {
      const page = pageAfterDelete(state.page, rowsOnPage);
      if (page !== state.page) {
        navigate({ ...state, page }, ThreadListNavigateMode.REPLACE);
      }
    },
    () => headingRef.current,
  );

  // A page past the end (old link, rows deleted elsewhere) lands on the last real page.
  const totalPages = query.data?.totalPages ?? 0;
  useEffect(() => {
    if (!query.isPlaceholderData && totalPages >= 1 && state.page > totalPages) {
      navigate({ ...state, page: totalPages }, ThreadListNavigateMode.REPLACE);
    }
  }, [query.isPlaceholderData, totalPages, state, navigate]);

  useThreadListFocus(state.page, query.data !== undefined && !query.isPlaceholderData, headingRef);

  return {
    state,
    search: search.value,
    setSearch: search.setValue,
    clearSearch: search.clear,
    setStatus: (status: ThreadListStatus) =>
      navigate({ ...state, status, page: 1 }, ThreadListNavigateMode.PUSH),
    setPage: (page) => navigate({ ...state, page }, ThreadListNavigateMode.PUSH),
    clearFilters: () => {
      search.clear();
      navigate(DEFAULT_THREAD_LIST_STATE, ThreadListNavigateMode.PUSH);
    },
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: () => void query.refetch(),
    publishingId: publish.publishingId,
    publishError: publish.error,
    publish: publish.publish,
    remove: deletion.remove,
    askDelete: deletion.ask,
  };
}
