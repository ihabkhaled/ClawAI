import { apiClient } from '@/services/shared/api-client';
import type {
  CreateProviderAppConfigRequest,
  ProviderAppConfigListResponse,
  ProviderCatalogResponse,
  UpdateProviderAppConfigRequest,
  WorkspaceHealthCheckResult,
  WorkspaceProviderAppConfig,
  WorkspaceProviderDefinition,
} from '@/types';

export const workspaceProviderRegistryRepository = {
  async listCatalog(): Promise<ProviderCatalogResponse> {
    const response = await apiClient.get<ProviderCatalogResponse>('/workspace/providers');
    return response.data;
  },

  async getProvider(provider: string): Promise<WorkspaceProviderDefinition> {
    const response = await apiClient.get<WorkspaceProviderDefinition>(
      `/workspace/providers/${provider}`,
    );
    return response.data;
  },

  async listAppConfigs(provider?: string): Promise<ProviderAppConfigListResponse> {
    const params = provider ? { provider } : undefined;
    const response = await apiClient.get<ProviderAppConfigListResponse>(
      '/workspace/provider-app-configs',
      params,
    );
    return response.data;
  },

  async getAppConfig(id: string): Promise<WorkspaceProviderAppConfig> {
    const response = await apiClient.get<WorkspaceProviderAppConfig>(
      `/workspace/provider-app-configs/${id}`,
    );
    return response.data;
  },

  async createAppConfig(data: CreateProviderAppConfigRequest): Promise<WorkspaceProviderAppConfig> {
    const response = await apiClient.post<WorkspaceProviderAppConfig>(
      '/workspace/provider-app-configs',
      data,
    );
    return response.data;
  },

  async updateAppConfig(
    id: string,
    data: UpdateProviderAppConfigRequest,
  ): Promise<WorkspaceProviderAppConfig> {
    const response = await apiClient.put<WorkspaceProviderAppConfig>(
      `/workspace/provider-app-configs/${id}`,
      data,
    );
    return response.data;
  },

  async deleteAppConfig(id: string): Promise<void> {
    await apiClient.delete(`/workspace/provider-app-configs/${id}`);
  },

  async testAppConfigConnection(input: {
    provider: string;
    providerAppConfigId: string;
  }): Promise<WorkspaceHealthCheckResult> {
    const response = await apiClient.post<WorkspaceHealthCheckResult>(
      '/workspace/oauth/test-connection',
      input,
    );
    return response.data;
  },

  async testPat(input: {
    provider: string;
    personalAccessToken: string;
    baseUrl?: string;
  }): Promise<WorkspaceHealthCheckResult> {
    const response = await apiClient.post<WorkspaceHealthCheckResult>(
      '/workspace/oauth/test-pat',
      input,
    );
    return response.data;
  },
};
