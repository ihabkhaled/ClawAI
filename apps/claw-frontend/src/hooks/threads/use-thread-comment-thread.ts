import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadCommentNode,
  ThreadCommentsData,
  ThreadCommentThreadController,
} from '@/types/thread-community.types';
import {
  mergeReplies,
  remainingReplies,
  updateComment,
} from '@/utilities/thread-comment-tree.utility';

/** One root comment and its replies: which reply box is open, and the "more replies" paging. */
export function useThreadCommentThread(
  slug: string,
  root: ThreadCommentNode,
): ThreadCommentThreadController {
  const queryClient = useQueryClient();
  const [replyTarget, setReplyTarget] = useState<ThreadCommentNode | null>(null);
  const more = useMutation({
    mutationFn: () =>
      threadPublicationsRepository.listPublicReplies(slug, root.id, root.nextReplyCursor),
    onSuccess: (page) => {
      queryClient.setQueryData<ThreadCommentsData>(
        queryKeys.threadPublications.comments(slug),
        (current) =>
          current
            ? updateComment(current, root.id, (found) => ({
                ...found,
                replies: mergeReplies(found.replies, page.items),
                nextReplyCursor: page.nextCursor,
                hasMoreReplies: page.hasMore,
              }))
            : current,
      );
    },
  });

  return {
    replyTarget,
    openReply: setReplyTarget,
    closeReply: (): void => setReplyTarget(null),
    loadMore: (): void => {
      if (!more.isPending) {
        more.mutate();
      }
    },
    isLoadingMore: more.isPending,
    loadMoreFailed: more.isError,
    remaining: root.hasMoreReplies ? Math.max(1, remainingReplies(root)) : 0,
  };
}
