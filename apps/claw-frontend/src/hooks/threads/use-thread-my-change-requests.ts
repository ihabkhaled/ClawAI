import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadMyChangeRequest } from '@/types/thread-publication.types';

/** The signed-in person's own suggestions, newest first, with their status. */
export function useThreadMyChangeRequests(): UseQueryResult<ThreadMyChangeRequest[]> {
  return useQuery({
    queryKey: queryKeys.threadPublications.myChangeRequests(),
    queryFn: () => threadPublicationsRepository.listMyChangeRequests(),
  });
}
