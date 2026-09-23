import { useQuery } from '@tanstack/react-query';

import { ARCHIVE_ENTRIES_STALE_MS } from '@/constants/archive.constants';
import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseArchiveEntriesReturn } from '@/types/archive.types';
import { isArchiveListingPending } from '@/utilities/archive-status.utility';

/**
 * The entries of one uploaded archive. Fetched only when asked for (a tree is
 * opened, a message attachment is drawn), cached, and polled only while the
 * archive is still being expanded — never on a fixed timer.
 *
 * No retry: a 404 (deleted, or not the caller's) is an answer, and the callers
 * fall back to drawing a plain attachment.
 */
export function useArchiveEntries(fileId: string, enabled: boolean): UseArchiveEntriesReturn {
  const query = useQuery({
    queryKey: queryKeys.files.archiveEntries(fileId),
    queryFn: () => filesRepository.getArchiveEntries(fileId),
    enabled: enabled && fileId.length > 0,
    staleTime: ARCHIVE_ENTRIES_STALE_MS,
    retry: false,
    refetchInterval: (currentQuery) =>
      isArchiveListingPending(currentQuery.state.data) ? QUERY_POLL_LIVE_SLOW_MS : false,
  });

  return { listing: query.data, isLoading: query.isLoading, isError: query.isError };
}
