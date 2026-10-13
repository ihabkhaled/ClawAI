import { useQuery } from '@tanstack/react-query';

import { useThreadChangeRequestForm } from '@/hooks/threads/use-thread-change-request-form';
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
  });

  return {
    requests,
    resolve,
    form,
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
