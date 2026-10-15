import { useQuery } from '@tanstack/react-query';

import { THREAD_CHANGE_REQUEST_VIEW_STALE_MS } from '@/constants/thread-change-requests.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadViewerOwnership } from '@/types/thread-publication.types';

/** Whether the signed-in reader owns this public Thread (and how many suggestions wait). Guests are never asked. */
export function useThreadViewerOwnership(
  slug: string,
  isAuthenticated: boolean,
): ThreadViewerOwnership | undefined {
  const viewer = useQuery({
    queryKey: queryKeys.threadPublications.viewer(slug),
    queryFn: () => threadPublicationsRepository.getPublicViewer(slug),
    enabled: slug !== '' && isAuthenticated,
    staleTime: THREAD_CHANGE_REQUEST_VIEW_STALE_MS,
    retry: false,
  });
  return isAuthenticated ? viewer.data : undefined;
}
