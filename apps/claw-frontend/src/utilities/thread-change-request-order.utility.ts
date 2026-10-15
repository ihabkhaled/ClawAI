import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import type { ThreadPublicationChangeRequest } from '@/types/thread-publication.types';

/** Waiting suggestions first (they need an answer), then the rest; each group keeps the server's newest-first order. */
export function orderChangeRequests(
  requests: ReadonlyArray<ThreadPublicationChangeRequest>,
): ThreadPublicationChangeRequest[] {
  const waiting = requests.filter(
    (request) => request.status === ThreadPublicationChangeRequestStatus.Pending,
  );
  const answered = requests.filter(
    (request) => request.status !== ThreadPublicationChangeRequestStatus.Pending,
  );
  return [...waiting, ...answered];
}
