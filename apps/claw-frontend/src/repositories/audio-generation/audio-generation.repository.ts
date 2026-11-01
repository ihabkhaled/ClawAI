import { apiClient } from '@/services/shared/api-client';
import type { AudioGeneration, AudioGenerationRetryResult } from '@/types/media-generation.types';

export const audioGenerationRepository = {
  async getById(generationId: string): Promise<AudioGeneration> {
    const response = await apiClient.get<AudioGeneration>(`/audio/${generationId}`);
    return response.data;
  },

  /** Re-runs a failed, timed-out or cancelled job as a successor row. */
  async retry(generationId: string): Promise<AudioGenerationRetryResult> {
    const response = await apiClient.post<AudioGenerationRetryResult>(
      `/audio/${generationId}/retry`,
    );
    return response.data;
  },
};
