import { apiClient } from '@/services/shared/api-client';
import type { FileGeneration } from '@/types/file-generation.types';

export const fileGenerationRepository = {
  async getById(generationId: string): Promise<FileGeneration> {
    const response = await apiClient.get<FileGeneration>(`/file-generations/${generationId}`);
    return response.data;
  },

  async retry(generationId: string): Promise<void> {
    await apiClient.post(`/file-generations/${generationId}/retry`);
  },
};
