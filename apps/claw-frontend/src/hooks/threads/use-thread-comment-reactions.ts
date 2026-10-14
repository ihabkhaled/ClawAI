import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadCommentReactionMutation,
  ThreadCommentReactionsController,
  ThreadCommentsData,
} from '@/types/thread-community.types';
import {
  applyReaction,
  findComment,
  nextReaction,
  updateComment,
} from '@/utilities/thread-comment-tree.utility';

/**
 * Like and dislike on one comment. The counts change at once and are put back if the server says
 * no, so a click never waits on the network and never leaves a wrong number behind.
 */
export function useThreadCommentReactions(
  slug: string,
  commentId: string,
): ThreadCommentReactionsController {
  const queryClient = useQueryClient();
  const key = queryKeys.threadPublications.comments(slug);
  const mutation: ThreadCommentReactionMutation = useMutation({
    mutationFn: ({ commentId: id, next }) =>
      next === null
        ? threadPublicationsRepository.removeCommentReaction(slug, id)
        : threadPublicationsRepository.setCommentReaction(slug, id, next),
    onMutate: async ({ commentId: id, next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ThreadCommentsData>(key);
      if (previous) {
        queryClient.setQueryData<ThreadCommentsData>(
          key,
          updateComment(previous, id, (found) => ({ ...found, ...applyReaction(found, next) })),
        );
      }
      return { previous };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) {
        queryClient.setQueryData<ThreadCommentsData>(key, context.previous);
      }
    },
    onSuccess: (counts, { commentId: id }) => {
      queryClient.setQueryData<ThreadCommentsData>(key, (current) =>
        current ? updateComment(current, id, (found) => ({ ...found, ...counts })) : current,
      );
    },
  });

  return {
    isPending: mutation.isPending,
    isFailed: mutation.isError,
    toggle: (value: ThreadPublicationReaction): void => {
      const current = queryClient.getQueryData<ThreadCommentsData>(key);
      const found = current ? findComment(current, commentId) : null;
      mutation.mutate({ commentId, next: nextReaction(found?.viewerReaction ?? null, value) });
    },
  };
}
