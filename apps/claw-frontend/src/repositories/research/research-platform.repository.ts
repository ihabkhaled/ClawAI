import { apiClient } from '@/services/shared/api-client';
import type {
  CreateResearchPlatformRequest,
  ResearchPlatform,
  ResearchPlatformTestResult,
  UpdateResearchPlatformRequest,
} from '@/types/research-platform.types';

const BASE = '/research/platforms';

/** research-service `/research/platforms` (guarded by RESEARCH_PROVIDERS_MANAGE, like search providers). */
export const researchPlatformRepository = {
  async list(): Promise<ResearchPlatform[]> {
    const response = await apiClient.get<ResearchPlatform[]>(BASE);
    return response.data;
  },

  async create(body: CreateResearchPlatformRequest): Promise<ResearchPlatform> {
    const response = await apiClient.post<ResearchPlatform>(BASE, body);
    return response.data;
  },

  async update(id: string, body: UpdateResearchPlatformRequest): Promise<ResearchPlatform> {
    const response = await apiClient.patch<ResearchPlatform>(
      `${BASE}/${encodeURIComponent(id)}`,
      body,
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
  },

  async test(id: string): Promise<ResearchPlatformTestResult> {
    const response = await apiClient.post<ResearchPlatformTestResult>(
      `${BASE}/${encodeURIComponent(id)}/test`,
      {},
    );
    return response.data;
  },
};
