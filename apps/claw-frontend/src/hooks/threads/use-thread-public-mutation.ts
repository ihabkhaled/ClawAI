import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadPublicAction, ThreadPublicMutation } from '@/types/thread-publication.types';

export function useThreadPublicMutation(slug: string): ThreadPublicMutation {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: ThreadPublicAction) => {
      if (action.kind === ThreadPublicationCommunityAction.Comment) {
        await threadPublicationsRepository.addPublicComment(slug, { content: action.content });
        return null;
      }
      if (action.kind === ThreadPublicationCommunityAction.ChangeRequest) {
        await threadPublicationsRepository.requestPublicChange(slug, {
          suggestion: action.suggestion,
        });
        return null;
      }
      if (action.kind === ThreadPublicationCommunityAction.Report) {
        await threadPublicationsRepository.reportPublicPublication(slug, {
          ...(action.commentId ? { commentId: action.commentId } : {}),
          reason: action.reason,
          ...(action.details ? { details: action.details } : {}),
        });
        return null;
      }
      return action.value === null
        ? threadPublicationsRepository.removePublicReaction(slug)
        : threadPublicationsRepository.setPublicReaction(slug, { value: action.value });
    },
    onSuccess: async (summary, action) => {
      if (action.kind === ThreadPublicationCommunityAction.Reaction && summary) {
        queryClient.setQueryData(['thread-publications', 'public', slug, 'reactions'], summary);
      } else if (action.kind !== ThreadPublicationCommunityAction.Reaction) {
        await queryClient.invalidateQueries({
          queryKey: ['thread-publications', 'public', slug, 'comments'],
        });
      }
    },
  });
}
