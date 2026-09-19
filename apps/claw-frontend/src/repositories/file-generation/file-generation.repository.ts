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

  /** Turns an answer the user already has into a file (no model call). */
  async exportAnswer(
    content: string,
    format: string,
    title: string,
  ): Promise<{ generationId: string; status: string }> {
    const response = await apiClient.post<{ generationId: string; status: string }>(
      '/file-generations/export',
      { content, format, title },
    );
    return response.data;
  },

  /** Rebuilds an expired file from its saved text: free and identical. */
  async rebuild(generationId: string): Promise<void> {
    await apiClient.post(`/file-generations/${generationId}/rebuild`);
  },
};
