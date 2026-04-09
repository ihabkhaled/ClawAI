import { apiClient } from '@/services/shared/api-client';
import type { ImageGeneration } from '@/types/image-generation.types';

export const imageGenerationRepository = {
  async getById(generationId: string): Promise<ImageGeneration> {
    const response = await apiClient.get<ImageGeneration>(`/images/${generationId}`);
    return response.data;
  },
};
