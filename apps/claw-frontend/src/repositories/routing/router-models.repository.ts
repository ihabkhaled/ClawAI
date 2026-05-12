import { apiClient } from '../../services/shared/api-client';
import type {
  ListRouterModelsQuery,
  RouterAdminOverride,
  RouterModel,
  RouterModelsList,
  UpdateRouterModelRequest,
} from '../../types/router-models.types';

const BASE = '/routing/models';

function toQueryString(query: ListRouterModelsQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }
  if (query.provider !== undefined) {
    params.set('provider', query.provider);
  }
  if (query.lifecycle !== undefined) {
    params.set('lifecycle', query.lifecycle);
  }
  if (query.isLocal !== undefined) {
    params.set('isLocal', String(query.isLocal));
  }
  if (query.isRouterOnly !== undefined) {
    params.set('isRouterOnly', String(query.isRouterOnly));
  }
  if (query.isExecutionCapable !== undefined) {
    params.set('isExecutionCapable', String(query.isExecutionCapable));
  }
  if (query.domain !== undefined) {
    params.set('domain', query.domain);
  }
  if (query.costClass !== undefined) {
    params.set('costClass', query.costClass);
  }
  if (query.qualityTier !== undefined) {
    params.set('qualityTier', query.qualityTier);
  }
  if (query.search !== undefined && query.search.length > 0) {
    params.set('search', query.search);
  }
  const s = params.toString();
  return s.length > 0 ? `?${s}` : '';
}

export async function listRouterModels(
  query: ListRouterModelsQuery = {},
): Promise<RouterModelsList> {
  const response = await apiClient.get<RouterModelsList>(`${BASE}${toQueryString(query)}`);
  return response.data;
}

export async function getRouterModel(id: string): Promise<RouterModel> {
  const response = await apiClient.get<RouterModel>(`${BASE}/${encodeURIComponent(id)}`);
  return response.data;
}

export async function updateRouterModel(
  id: string,
  payload: UpdateRouterModelRequest,
): Promise<RouterModel> {
  const response = await apiClient.patch<RouterModel>(`${BASE}/${encodeURIComponent(id)}`, payload);
  return response.data;
}

export async function softDeleteRouterModel(id: string): Promise<RouterModel> {
  const response = await apiClient.delete<RouterModel>(`${BASE}/${encodeURIComponent(id)}`);
  return response.data;
}

export async function listRouterModelOverrides(profileId: string): Promise<RouterAdminOverride[]> {
  const response = await apiClient.get<RouterAdminOverride[]>(
    `${BASE}/${encodeURIComponent(profileId)}/overrides`,
  );
  return response.data;
}

export async function clearRouterModelOverride(
  profileId: string,
  fieldName: string,
): Promise<void> {
  await apiClient.delete(
    `${BASE}/${encodeURIComponent(profileId)}/overrides/${encodeURIComponent(fieldName)}`,
  );
}
