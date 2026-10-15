import { useQuery } from '@tanstack/react-query';

import { THREAD_CHANGE_REQUEST_VIEW_STALE_MS } from '@/constants/thread-change-requests.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadChangeRequester } from '@/types/thread-publication.types';

/** "Improved with suggestions from": accepted or applied suggestions only, names only. */
export function useThreadChangeCredits(slug: string): ThreadChangeRequester[] {
  const credits = useQuery({
    queryKey: queryKeys.threadPublications.credits(slug),
    queryFn: () => threadPublicationsRepository.listPublicChangeCredits(slug),
    enabled: slug !== '',
    staleTime: THREAD_CHANGE_REQUEST_VIEW_STALE_MS,
    retry: false,
  });
  return credits.data ?? [];
}
