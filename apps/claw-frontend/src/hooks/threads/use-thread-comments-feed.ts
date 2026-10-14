import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { THREAD_COMMENTS_STALE_MS } from '@/constants/thread-community.constants';
import { useThreadCommentHashFocus } from '@/hooks/threads/use-thread-comment-hash-focus';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadCommentsFeed } from '@/types/thread-community.types';
import { uniqueRoots } from '@/utilities/thread-comment-tree.utility';

/** Top-level comments, newest first, one page at a time; replies ride along inside each root. */
export function useThreadCommentsFeed(slug: string): ThreadCommentsFeed {
  const query = useInfiniteQuery({
    queryKey: queryKeys.threadPublications.comments(slug),
    queryFn: ({ pageParam }) => threadPublicationsRepository.listPublicComments(slug, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: slug !== '',
    staleTime: THREAD_COMMENTS_STALE_MS,
    // A refetch would fold the replies a reader already opened back to the first page.
    refetchOnWindowFocus: false,
  });
  const comments = useMemo(
    () => uniqueRoots(query.data?.pages.flatMap((page) => page.items) ?? []),
    [query.data],
  );
  const loadedIds = useMemo(
    () => comments.flatMap((root) => [root.id, ...root.replies.map((reply) => reply.id)]).join(','),
    [comments],
  );
  const highlightedId = useThreadCommentHashFocus(loadedIds);
  return {
    comments,
    highlightedId,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
}
