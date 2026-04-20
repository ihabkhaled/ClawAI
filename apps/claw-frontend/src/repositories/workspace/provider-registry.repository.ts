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

  async initOAuth(input: {
    provider: string;
    providerAppConfigId: string;
    redirectUri: string;
    scopes?: string[];
  }): Promise<{ authorizationUrl: string; state: string }> {
    const response = await apiClient.post<{ authorizationUrl: string; state: string }>(
      '/workspace/oauth/init',
      { ...input, scopes: input.scopes ?? [] },
    );
    return response.data;
  },

  async completeOAuth(input: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<{ id: string; provider: string; name: string }> {
    const params = new URLSearchParams({
      code: input.code,
      state: input.state,
      redirectUri: input.redirectUri,
    });
    const response = await apiClient.get<{ id: string; provider: string; name: string }>(
      `/workspace/oauth/callback?${params.toString()}`,
    );
    return response.data;
  },
};
