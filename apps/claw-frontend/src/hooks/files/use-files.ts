import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';
import { FileIngestionStatus } from '@/enums';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FilesQueryFilters, PaginatedFiles } from '@/types/archive.types';
import { logger } from '@/utilities';
import { toFilesQueryParams } from '@/utilities/files-query.utility';

/**
 * One page of the file list, polled only while something is being ingested.
 *
 * Ingestion finishes server-side after the upload mutation has returned, so the
 * `PENDING → PROCESSING → COMPLETED` transition has no event to ride on and the
 * list genuinely has to ask. But asking on a fixed timer is the wrong trade
 * here: this endpoint returns **4.2 MB** — measured, no projection on the
 * backend — and it answered a 304 every ten seconds per open tab while the
 * service still queried, serialised and hashed the whole body to find that out.
 *
 * So the interval is conditional on the answer, the way `use-discovery-runs`
 * and `use-deployment-page` already do it: poll while a file is in flight, stop
 * the moment none is.
 *
 * The list holds top-level files only: an archive's extracted files are listed
 * under it (`GET /files/:id/archive-entries`), not beside it, so a 500-file ZIP
 * no longer fills every page. `meta` is the server's paging answer.
 */
export function useFiles(filters: FilesQueryFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.files.list(filters),
    queryFn: (): Promise<PaginatedFiles> => {
      logger.debug({
        component: 'files',
        action: 'fetch-files',
        message: 'Fetching files list',
      });
      return filesRepository.getFilesPage(toFilesQueryParams(filters));
    },
    placeholderData: keepPreviousData,
    refetchInterval: (currentQuery) => {
      const page = currentQuery.state.data;
      if (page === undefined) {
        return false;
      }
      const isIngesting = page.data.some(
        (file) =>
          file.ingestionStatus === FileIngestionStatus.PENDING ||
          file.ingestionStatus === FileIngestionStatus.PROCESSING,
      );
      return isIngesting ? QUERY_POLL_LIVE_SLOW_MS : false;
    },
  });

  return {
    files: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
