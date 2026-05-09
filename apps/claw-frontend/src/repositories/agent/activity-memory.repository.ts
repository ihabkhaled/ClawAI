import { apiClient } from '../../services/shared/api-client';
import type {
  ListActivityQuery,
  PaginatedActivity,
} from '../../types/activity-memory.types';

const BASE = '/agent/activity-memory';

export async function listActivityEntries(
  query?: ListActivityQuery,
): Promise<PaginatedActivity> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {params.set('page', String(query.page));}
  if (query?.pageSize !== undefined) {params.set('pageSize', String(query.pageSize));}
  if (query?.kind !== undefined) {params.set('kind', query.kind);}
  const qs = params.toString();
  const response = await apiClient.get<PaginatedActivity>(
    qs.length > 0 ? `${BASE}?${qs}` : BASE,
  );
  return response.data;
}
