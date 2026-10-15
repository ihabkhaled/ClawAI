import { useQuery } from '@tanstack/react-query';

import { useThreadChangeRequestForm } from '@/hooks/threads/use-thread-change-request-form';
import { useThreadChangeRequestHighlight } from '@/hooks/threads/use-thread-change-request-highlight';
import { useThreadChangeRequestResolve } from '@/hooks/threads/use-thread-change-request-resolve';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadChangeRequestsController,
  ThreadChangeRequestsProps,
} from '@/types/thread-publication.types';

/** Reader suggestions for one publication, with the owner's answers and the decision mutation. */
export function useThreadChangeRequests({
  publicationId,
  revisionSource,
  onRevisionStarted,
  onEditMyself,
}: ThreadChangeRequestsProps): ThreadChangeRequestsController {
  const form = useThreadChangeRequestForm(revisionSource);
  const requests = useQuery({
    queryKey: ['thread-publications', publicationId, 'change-requests'],
    queryFn: () => threadPublicationsRepository.listChangeRequests(publicationId),
    enabled: publicationId !== '',
  });
  const resolve = useThreadChangeRequestResolve({
    publicationId,
    revisionSource,
    form,
    onRevisionStarted,
    onEditMyself,
  });
  const highlightedId = useThreadChangeRequestHighlight(
    (requests.data ?? []).map((request) => request.id),
  );

  return {
    requests,
    resolve,
    form,
    highlightedId,
    chooseAcceptance: (requestId) => {
      form.chooseAcceptance(requestId);
      resolve.reset();
    },
    beginAcceptance: (requestId) => {
      form.beginAcceptance(requestId);
      resolve.reset();
    },
    cancelAcceptance: () => {
      form.cancelAcceptance();
      resolve.reset();
    },
  };
}
