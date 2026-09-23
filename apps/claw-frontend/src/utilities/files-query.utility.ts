import type { FilesQueryFilters } from '@/types/archive.types';

/** The query string for `GET /files`: only the filters that are set, as strings. */
export function toFilesQueryParams(filters: FilesQueryFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.page !== undefined) {
    params['page'] = String(filters.page);
  }
  if (filters.limit !== undefined) {
    params['limit'] = String(filters.limit);
  }
  if (filters.ingestionStatus !== undefined) {
    params['ingestionStatus'] = filters.ingestionStatus;
  }
  if (filters.parentId !== undefined) {
    params['parentId'] = filters.parentId;
  }
  return params;
}
