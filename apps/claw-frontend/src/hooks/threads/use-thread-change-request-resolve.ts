import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadChangeRequestDecision,
  ThreadChangeRequestResolveInput,
  ThreadChangeRequestsController,
} from '@/types/thread-publication.types';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

/** Reject a reader suggestion, or accept it by sending the revised article for a capped review. */
export function useThreadChangeRequestResolve({
  publicationId,
  revisionSource,
  form,
  onRevisionStarted,
}: ThreadChangeRequestResolveInput): ThreadChangeRequestsController['resolve'] {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, status, ownerResponse }: ThreadChangeRequestDecision) => {
      const response = ownerResponse.trim();
      const responseField = response === '' ? {} : { ownerResponse: response };
      if (status === ThreadPublicationChangeRequestStatus.Rejected) {
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
    onSuccess: async ({ edit }, { requestId }) => {
      if (edit) {
        onRevisionStarted(edit.revisionId);
      }
      form.finishRequest(requestId);
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', publicationId, 'change-requests'],
      });
    },
  });
}
