import { apiClient } from '@/services/shared/api-client';
import type {
  ApproveCandidateRequest,
  BulkApproveRequest,
  BulkApproveResponse,
  CandidateListFilters,
  CandidateListResponse,
  CreateCatalogEntryRequest,
  CreateDiscoverySourceRequest,
  DiscoveryCandidate,
  DiscoveryRun,
  DiscoveryRunListResponse,
  DiscoverySource,
  DiscoveryTriggerRequest,
  DiscoveryTriggerResponse,
  HardwarePack,
  InstallPackResponse,
  ModelCatalogEntry,
  RejectCandidateRequest,
  RunListFilters,
  UpdateCatalogEntryRequest,
  UpdateDiscoverySourceRequest,
} from '@/types';

const filtersToParams = (
  filters: Record<string, unknown> | undefined,
): Record<string, string> | undefined => {
  if (filters === undefined) {
    return undefined;
  }
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) {
      continue;
    }
    params[key] = String(value);
  }
  return Object.keys(params).length > 0 ? params : undefined;
};

export const discoveryRepository = {
  async listSources(): Promise<DiscoverySource[]> {
    const response = await apiClient.get<DiscoverySource[]>('/ollama/discovery/sources');
    return response.data;
  },

  async createSource(data: CreateDiscoverySourceRequest): Promise<DiscoverySource> {
    const response = await apiClient.post<DiscoverySource>('/ollama/discovery/sources', data);
    return response.data;
  },

  async updateSource(id: string, data: UpdateDiscoverySourceRequest): Promise<DiscoverySource> {
    const response = await apiClient.put<DiscoverySource>(`/ollama/discovery/sources/${id}`, data);
    return response.data;
  },

  async deleteSource(id: string): Promise<void> {
    await apiClient.delete(`/ollama/discovery/sources/${id}`);
  },

  async triggerRefresh(data: DiscoveryTriggerRequest): Promise<DiscoveryTriggerResponse> {
    const response = await apiClient.post<DiscoveryTriggerResponse>(
      '/ollama/discovery/refresh',
      data,
    );
    return response.data;
  },

  async listRuns(filters?: RunListFilters): Promise<DiscoveryRunListResponse> {
    const response = await apiClient.get<DiscoveryRunListResponse>(
      '/ollama/discovery/runs',
      filtersToParams(filters as Record<string, unknown>),
    );
    return response.data;
  },

  async getRun(id: string): Promise<DiscoveryRun> {
    const response = await apiClient.get<DiscoveryRun>(`/ollama/discovery/runs/${id}`);
    return response.data;
  },

  async listCandidates(filters?: CandidateListFilters): Promise<CandidateListResponse> {
    const response = await apiClient.get<CandidateListResponse>(
      '/ollama/discovery/candidates',
      filtersToParams(filters as Record<string, unknown>),
    );
    return response.data;
  },

  async approveCandidate(id: string, data: ApproveCandidateRequest): Promise<DiscoveryCandidate> {
    const response = await apiClient.post<DiscoveryCandidate>(
      `/ollama/discovery/candidates/${id}/approve`,
      data,
    );
    return response.data;
  },

  async rejectCandidate(id: string, data: RejectCandidateRequest): Promise<DiscoveryCandidate> {
    const response = await apiClient.post<DiscoveryCandidate>(
      `/ollama/discovery/candidates/${id}/reject`,
      data,
    );
    return response.data;
  },

  async bulkApprove(data: BulkApproveRequest): Promise<BulkApproveResponse> {
    const response = await apiClient.post<BulkApproveResponse>(
      '/ollama/discovery/candidates/bulk-approve',
      data,
    );
    return response.data;
  },

  async createCatalogEntry(data: CreateCatalogEntryRequest): Promise<ModelCatalogEntry> {
    const response = await apiClient.post<ModelCatalogEntry>('/ollama/catalog/admin', data);
    return response.data;
  },

  async updateCatalogEntry(
    id: string,
    data: UpdateCatalogEntryRequest,
  ): Promise<ModelCatalogEntry> {
    const response = await apiClient.put<ModelCatalogEntry>(`/ollama/catalog/admin/${id}`, data);
    return response.data;
  },

  async deleteCatalogEntry(id: string): Promise<void> {
    await apiClient.delete(`/ollama/catalog/admin/${id}`);
  },

  async listPacks(): Promise<HardwarePack[]> {
    const response = await apiClient.get<HardwarePack[]>('/ollama/packs');
    return response.data;
  },

  async installPack(profile: string): Promise<InstallPackResponse> {
    const response = await apiClient.post<InstallPackResponse>(
      `/ollama/packs/${profile}/install`,
      {},
    );
    return response.data;
  },
};
