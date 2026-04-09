import { apiClient } from '@/services/shared/api-client';
import type { ImageGeneration } from '@/types/image-generation.types';

export const imageGenerationRepository = {
  async getById(generationId: string): Promise<ImageGeneration> {
    const response = await apiClient.get<ImageGeneration>(`/images/${generationId}`);
    return response.data;
  },

  async retry(generationId: string): Promise<void> {
    await apiClient.post(`/images/${generationId}/retry`);
  },

  async retryAlternate(
    generationId: string,
    provider?: string,
    model?: string,
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const response = await apiClient.post<{
      generationId: string;
      status: string;
      provider: string;
      model: string;
    }>(`/images/${generationId}/retry-alternate`, { provider, model });
    return response.data;
  },
};
