import { apiClient } from '../../services/shared/api-client';
import type {
  ListMarketplaceQuery,
  MarketplaceListing,
  PaginatedListings,
  SandboxResult,
} from '../../types/marketplace.types';

const BASE = '/agent/marketplace/listings';

export async function listMarketplaceListings(
  query?: ListMarketplaceQuery,
): Promise<PaginatedListings> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {params.set('page', String(query.page));}
  if (query?.pageSize !== undefined) {params.set('pageSize', String(query.pageSize));}
  if (query?.search !== undefined) {params.set('search', query.search);}
  const qs = params.toString();
  const response = await apiClient.get<PaginatedListings>(qs.length > 0 ? `${BASE}?${qs}` : BASE);
  return response.data;
}

export async function getMarketplaceListing(id: string): Promise<MarketplaceListing> {
  const response = await apiClient.get<MarketplaceListing>(`${BASE}/${encodeURIComponent(id)}`);
  return response.data;
}

export async function installMarketplaceListing(id: string): Promise<MarketplaceListing> {
  const response = await apiClient.post<MarketplaceListing>(
    `${BASE}/${encodeURIComponent(id)}/install`,
    {},
  );
  return response.data;
}

export async function analyseMarketplaceListing(id: string): Promise<SandboxResult> {
  const response = await apiClient.get<SandboxResult>(
    `${BASE}/${encodeURIComponent(id)}/analyse`,
  );
  return response.data;
}
