import { apiClient } from '@/services/shared/api-client';
import type {
  CreateResearchProviderRequest,
  ProviderHealthResult,
  ResearchRun,
  SanitizedResearchProvider,
} from '@/types';

const BASE = '/research';

export const researchRepository = {
  async listProviders(): Promise<SanitizedResearchProvider[]> {
    const response = await apiClient.get<SanitizedResearchProvider[]>(`${BASE}/search-providers`);
    return response.data;
  },

  async getProvider(id: string): Promise<SanitizedResearchProvider> {
    const response = await apiClient.get<SanitizedResearchProvider>(
      `${BASE}/search-providers/${id}`,
    );
    return response.data;
  },

  async createProvider(body: CreateResearchProviderRequest): Promise<SanitizedResearchProvider> {
    const response = await apiClient.post<SanitizedResearchProvider>(
      `${BASE}/search-providers`,
      body,
    );
    return response.data;
  },

  async deleteProvider(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/search-providers/${id}`);
  },

  async testProvider(id: string): Promise<ProviderHealthResult> {
    const response = await apiClient.post<ProviderHealthResult>(
      `${BASE}/search-providers/${id}/test`,
      {},
    );
    return response.data;
  },

  async listRuns(limit = 20): Promise<ResearchRun[]> {
    const response = await apiClient.get<ResearchRun[]>(`${BASE}/runs?limit=${String(limit)}`);
    return response.data;
  },

  async getRun(id: string): Promise<ResearchRun> {
    const response = await apiClient.get<ResearchRun>(`${BASE}/runs/${id}`);
    return response.data;
  },
};
