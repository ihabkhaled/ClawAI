import { apiClient } from '@/services/shared/api-client';
import type {
  HfImportRequest,
  HfImportResponse,
  HfModelDetails,
  HfModelSummary,
  HfSearchQuery,
} from '@/types/hf-search.types';
import type {
  FrontierCatalogEntry,
  FrontierCatalogFilters,
  FrontierCatalogList,
  HardwareSnapshot,
  LoadedModel,
  PullJob,
  PullJobCreateResult,
  RuntimeConfig,
  RuntimeInfo,
  UpdateRuntimeConfigPayload,
} from '@/types/local-frontier.types';
import type { CancelPullResult } from '@/types/pull-job-cancel.types';

export const localFrontierRepository = {
  async listCatalog(filters: FrontierCatalogFilters): Promise<FrontierCatalogList> {
    const params: Record<string, string> = {};
    if (filters.category) {
      params['category'] = filters.category;
    }
    if (filters.qualityTier) {
      params['qualityTier'] = filters.qualityTier;
    }
    if (filters.compatibleOnly !== undefined) {
      params['compatibleOnly'] = String(filters.compatibleOnly);
    }
    if (filters.limit !== undefined) {
      params['limit'] = String(filters.limit);
    }
    if (filters.cursor) {
      params['cursor'] = filters.cursor;
    }
    const response = await apiClient.get<FrontierCatalogList>('/llamacpp/catalog', params);
    return response.data;
  },

  async getCatalogEntry(id: string): Promise<FrontierCatalogEntry> {
    const response = await apiClient.get<FrontierCatalogEntry>(`/llamacpp/catalog/${id}`);
    return response.data;
  },

  async refreshCatalog(): Promise<{ refreshed: number; failed: number }> {
    const response = await apiClient.post<{ refreshed: number; failed: number }>(
      '/llamacpp/catalog/refresh',
      {},
    );
    return response.data;
  },

  async initiatePull(modelId: string, overrideHardwareGate: boolean): Promise<PullJobCreateResult> {
    const response = await apiClient.post<PullJobCreateResult>(
      `/llamacpp/catalog/${modelId}/pull`,
      { overrideHardwareGate },
    );
    return response.data;
  },

  async listPullJobs(): Promise<{ rows: PullJob[]; total: number }> {
    const response = await apiClient.get<{ rows: PullJob[]; total: number }>('/llamacpp/pull-jobs');
    return response.data;
  },

  async getPullJob(id: string): Promise<PullJob> {
    const response = await apiClient.get<PullJob>(`/llamacpp/pull-jobs/${id}`);
    return response.data;
  },

  async cancelPull(id: string): Promise<CancelPullResult> {
    const response = await apiClient.delete<CancelPullResult>(`/llamacpp/pull-jobs/${id}`);
    return response.data;
  },

  async retryPull(id: string): Promise<PullJobCreateResult> {
    const response = await apiClient.post<PullJobCreateResult>(`/llamacpp/pull-jobs/${id}/retry`, {});
    return response.data;
  },

  async getHardware(): Promise<HardwareSnapshot> {
    const response = await apiClient.get<HardwareSnapshot>('/llamacpp/hardware');
    return response.data;
  },

  async refreshHardware(): Promise<HardwareSnapshot> {
    const response = await apiClient.post<HardwareSnapshot>('/llamacpp/hardware/refresh', {});
    return response.data;
  },

  async loadModel(modelId: string): Promise<LoadedModel> {
    const response = await apiClient.post<LoadedModel>(`/llamacpp/models/${modelId}/load`, {});
    return response.data;
  },

  async unloadModel(modelId: string): Promise<{ unloaded: boolean }> {
    const response = await apiClient.post<{ unloaded: boolean }>(`/llamacpp/models/${modelId}/unload`, {});
    return response.data;
  },

  async getLoadedModel(): Promise<LoadedModel | null> {
    try {
      const response = await apiClient.get<LoadedModel>('/llamacpp/models/loaded');
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  async updateRuntimeConfig(
    modelId: string,
    payload: UpdateRuntimeConfigPayload,
  ): Promise<RuntimeConfig> {
    const response = await apiClient.put<RuntimeConfig>(`/llamacpp/models/${modelId}/config`, payload);
    return response.data;
  },

  async deleteWeights(modelId: string, confirmName: string): Promise<{ deleted: boolean }> {
    // apiClient.delete does not forward a request body; encode confirmName as a query
    // parameter (?confirmName=<name>). Backend DTO accepts both query and body forms.
    const path = `/llamacpp/models/${modelId}/weights?confirmName=${encodeURIComponent(confirmName)}`;
    const response = await apiClient.delete<{ deleted: boolean }>(path);
    return response.data;
  },

  async getRuntimeInfo(): Promise<RuntimeInfo> {
    const response = await apiClient.get<RuntimeInfo>('/llamacpp/runtime/info');
    return response.data;
  },

  async searchHuggingFace(query: HfSearchQuery): Promise<HfModelSummary[]> {
    const params: Record<string, string> = {};
    if (query.q !== undefined && query.q.length > 0) {
      params['q'] = query.q;
    }
    if (query.sort) {
      params['sort'] = query.sort;
    }
    if (query.limit !== undefined) {
      params['limit'] = String(query.limit);
    }
    const response = await apiClient.get<HfModelSummary[]>('/llamacpp/catalog/hf-search', params);
    return response.data;
  },

  async getHuggingFaceDetails(repo: string): Promise<HfModelDetails> {
    const response = await apiClient.get<HfModelDetails>(`/llamacpp/catalog/hf-models/${repo}`);
    return response.data;
  },

  async importFromHuggingFace(payload: HfImportRequest): Promise<HfImportResponse> {
    const response = await apiClient.post<HfImportResponse>('/llamacpp/catalog/hf-import', payload);
    return response.data;
  },
};
