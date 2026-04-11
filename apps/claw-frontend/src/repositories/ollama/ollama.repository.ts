import { apiClient } from '@/services/shared/api-client';
import type {
  LocalModel,
  PullModelRequest,
  AssignRoleRequest,
  LocalModelsListResponse,
  RuntimesListResponse,
  RuntimeHealthResponse,
  CatalogListResponse,
  ModelCatalogEntry,
  PullFromCatalogResponse,
  PullJobResponse,
} from '@/types';

export const ollamaRepository = {
  async getLocalModels(params?: Record<string, string>): Promise<LocalModelsListResponse> {
    const response = await apiClient.get<LocalModelsListResponse>('/ollama/models', params);
    return response.data;
  },

  async pullModel(data: PullModelRequest): Promise<LocalModel> {
    const response = await apiClient.post<LocalModel>('/ollama/pull', data);
    return response.data;
  },

  async assignRole(data: AssignRoleRequest): Promise<LocalModel> {
    const response = await apiClient.post<LocalModel>('/ollama/assign-role', data);
    return response.data;
  },

  async getRuntimes(): Promise<RuntimesListResponse> {
    const response = await apiClient.get<RuntimesListResponse>('/ollama/runtimes');
    return response.data;
  },

  async getHealth(): Promise<RuntimeHealthResponse> {
    const response = await apiClient.get<RuntimeHealthResponse>('/ollama/health');
    return response.data;
  },

  async getCatalog(params?: Record<string, string>): Promise<CatalogListResponse> {
    const response = await apiClient.get<CatalogListResponse>('/ollama/catalog', params);
    return response.data;
  },

  async getCatalogEntry(id: string): Promise<ModelCatalogEntry> {
    const response = await apiClient.get<ModelCatalogEntry>(`/ollama/catalog/${id}`);
    return response.data;
  },

  async pullFromCatalog(catalogId: string): Promise<PullFromCatalogResponse> {
    const response = await apiClient.post<PullFromCatalogResponse>(
      `/ollama/catalog/${catalogId}/pull`,
    );
    return response.data;
  },

  async getPullJobs(): Promise<PullJobResponse[]> {
    const response = await apiClient.get<PullJobResponse[]>('/ollama/pull-jobs');
    return response.data;
  },

  async cancelPullJob(id: string): Promise<void> {
    await apiClient.delete(`/ollama/pull-jobs/${id}`);
  },

  async deleteModel(modelId: string): Promise<void> {
    await apiClient.delete(`/ollama/models/${modelId}`);
  },
};
