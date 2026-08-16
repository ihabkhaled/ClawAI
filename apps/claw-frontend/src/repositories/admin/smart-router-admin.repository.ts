import { SMART_ROUTER_GLOBAL_SCOPE } from '@/constants/smart-router-admin.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  CreateRouterConfigurationRequest,
  ListRouterConfigurationsQuery,
  PaginatedRouterConfigurations,
  RouterConfigurationDetail,
  UpdateChainEntriesRequest,
} from '@/types/smart-router-admin.types';

const BASE = '/routing/configurations';

function toListParams(query: ListRouterConfigurationsQuery): Record<string, string> {
  const params: Record<string, string> = { scope: query.scope ?? SMART_ROUTER_GLOBAL_SCOPE };
  if (query.status !== undefined) {
    params.status = query.status;
  }
  if (query.page !== undefined) {
    params.page = String(query.page);
  }
  if (query.limit !== undefined) {
    params.limit = String(query.limit);
  }
  return params;
}

export const smartRouterAdminRepository = {
  async list(query: ListRouterConfigurationsQuery = {}): Promise<PaginatedRouterConfigurations> {
    const response = await apiClient.get<PaginatedRouterConfigurations>(BASE, toListParams(query));
    return response.data;
  },

  async getById(id: string): Promise<RouterConfigurationDetail> {
    const response = await apiClient.get<RouterConfigurationDetail>(
      `${BASE}/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async createDraft(
    payload: CreateRouterConfigurationRequest = {},
  ): Promise<RouterConfigurationDetail> {
    const response = await apiClient.post<RouterConfigurationDetail>(BASE, {
      scope: payload.scope ?? SMART_ROUTER_GLOBAL_SCOPE,
    });
    return response.data;
  },

  async updateEntries(
    id: string,
    payload: UpdateChainEntriesRequest,
  ): Promise<RouterConfigurationDetail> {
    const response = await apiClient.patch<RouterConfigurationDetail>(
      `${BASE}/${encodeURIComponent(id)}/entries`,
      payload,
    );
    return response.data;
  },

  async publish(id: string): Promise<RouterConfigurationDetail> {
    const response = await apiClient.post<RouterConfigurationDetail>(
      `${BASE}/${encodeURIComponent(id)}/publish`,
    );
    return response.data;
  },

  async setEnabled(scope: string, enabled: boolean): Promise<RouterConfigurationDetail> {
    const action = enabled ? 'enable' : 'disable';
    const response = await apiClient.post<RouterConfigurationDetail>(
      `${BASE}/${action}?scope=${encodeURIComponent(scope)}`,
    );
    return response.data;
  },
};
