import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';
import { FileIngestionStatus } from '@/enums';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UploadedFile } from '@/types';
import { logger } from '@/utilities';

/**
 * The file list, polled only while something is actually being ingested.
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
 * the moment none is. On the overwhelmingly common case — every file already
 * ingested — this costs nothing at all.
 *
 * The 4.2 MB itself is a separate, backend problem: the files endpoint applies
 * no projection, so a list view downloads every column of every row. Fixing
 * that belongs with the endpoint, not here.
 */
export function useFiles(filters: Record<string, unknown> = {}) {
  const params: Record<string, string> = {};
  if (filters['ingestionStatus'] !== undefined) {
    params['ingestionStatus'] = String(filters['ingestionStatus']);
  }

  const query = useQuery({
    queryKey: queryKeys.files.list(filters),
    queryFn: () => {
      logger.debug({
        component: 'files',
        action: 'fetch-files',
        message: 'Fetching files list',
      });
      return filesRepository.getFiles(params);
    },
    refetchInterval: (currentQuery) => {
      const files = currentQuery.state.data as UploadedFile[] | undefined;
      if (files === undefined) {
        return false;
      }
      const isIngesting = files.some(
        (file) =>
          file.ingestionStatus === FileIngestionStatus.PENDING ||
          file.ingestionStatus === FileIngestionStatus.PROCESSING,
      );
      return isIngesting ? QUERY_POLL_LIVE_SLOW_MS : false;
    },
  });

  return {
    files: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
