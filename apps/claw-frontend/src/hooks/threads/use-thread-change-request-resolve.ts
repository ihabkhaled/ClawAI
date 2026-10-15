import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThreadChangeAcceptMode } from '@/enums/thread-change-accept-mode.enum';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadChangeRequestDecision,
  ThreadChangeRequestResolveInput,
  ThreadChangeRequestsController,
} from '@/types/thread-publication.types';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

/**
 * Decline a reader suggestion, or accept it: by sending the revised article for a capped review,
 * or on its own when the owner will edit the article themselves.
 */
export function useThreadChangeRequestResolve({
  publicationId,
  revisionSource,
  form,
  onRevisionStarted,
  onEditMyself,
}: ThreadChangeRequestResolveInput): ThreadChangeRequestsController['resolve'] {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, status, ownerResponse, mode }: ThreadChangeRequestDecision) => {
      const response = ownerResponse.trim();
      const responseField = response === '' ? {} : { ownerResponse: response };
      if (status === ThreadPublicationChangeRequestStatus.Rejected) {
        return threadPublicationsRepository.resolveChangeRequest(publicationId, requestId, {
          status,
          ...responseField,
        });
      }
      if (mode === ThreadChangeAcceptMode.EditMyself) {
        return threadPublicationsRepository.resolveChangeRequest(publicationId, requestId, {
          status,
          ...responseField,
        });
      }
      if (!revisionSource) {
        throw new Error('Revision source unavailable');
      }
      const revision = createThreadRevisionRequest({
        markdown: form.revisionMarkdown,
        citations: revisionSource.citations,
        spendCapUsd: Number(form.spendCapUsd),
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      });
      return threadPublicationsRepository.resolveChangeRequest(publicationId, requestId, {
        status,
        ...responseField,
        revision,
      });
    },
    onSuccess: async ({ edit }, { requestId, mode }) => {
      if (edit) {
        onRevisionStarted(edit.revisionId);
      }
      if (mode === ThreadChangeAcceptMode.EditMyself) {
        onEditMyself?.();
      }
      form.finishRequest(requestId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['thread-publications', publicationId, 'change-requests'],
        }),
        // The pending badge on the owner's Threads list counts these.
        queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] }),
      ]);
    },
  });
}
