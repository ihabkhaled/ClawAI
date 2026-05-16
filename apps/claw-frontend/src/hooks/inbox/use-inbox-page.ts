import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { INBOX_DEFAULT_PAGE_LIMIT } from '@/constants/inbox.constants';
import { useFileViewer } from '@/hooks/file-viewer/use-file-viewer';
import { queryKeys } from '@/repositories/shared/query-keys';
import {
  listInbox,
  setNeedsAttention as setNeedsAttentionApi,
} from '@/repositories/workspace/inbox.repository';
import type {
  InboxFilterState,
  InboxPage,
  UseInboxPageResult,
} from '@/types/workspace-inbox.types';

export function useInboxPage(): UseInboxPageResult {
  const [filter, setFilter] = useState<InboxFilterState>({
    providers: [],
    types: [],
    needsAttention: false,
    hasSuggestion: false,
  });
  const queryClient = useQueryClient();

  const filterKey = {
    providers: filter.providers.join(','),
    types: filter.types.join(','),
    needsAttention: filter.needsAttention,
    hasSuggestion: filter.hasSuggestion,
  };

  const query = useInfiniteQuery({
    queryKey: queryKeys.workspaceInbox.list(filterKey),
    queryFn: ({ pageParam }) =>
      listInbox({
        providers: filter.providers,
        types: filter.types,
        needsAttention: filter.needsAttention || undefined,
        hasSuggestion: filter.hasSuggestion || undefined,
        cursor: (pageParam as string | null) ?? undefined,
        limit: INBOX_DEFAULT_PAGE_LIMIT,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: InboxPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });

  const items = (query.data?.pages ?? []).flatMap((p) => p.items);

  const mutation = useMutation({
    mutationFn: (params: { id: string; needsAttention: boolean }) =>
      setNeedsAttentionApi(params.id, params.needsAttention),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceInbox.all });
    },
  });

  const toggleNeedsAttention = useCallback(
    (id: string, next: boolean): void => {
      void mutation.mutateAsync({ id, needsAttention: next });
    },
    [mutation],
  );

  const loadMore = useCallback((): void => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  // v3 round 11 — composed file-viewer sub-controller. The inbox page is
  // a single-controller-hook page; composing useFileViewer here keeps
  // that rule intact while letting inbox rows open the viewer.
  const fileViewer = useFileViewer();

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    filter,
    setFilter,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    toggleNeedsAttention,
    isUpdating: mutation.isPending,
    fileViewer,
  };
}
