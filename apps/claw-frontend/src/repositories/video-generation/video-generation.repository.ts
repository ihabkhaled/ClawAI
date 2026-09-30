import { apiClient } from '@/services/shared/api-client';
import type {
  VideoGeneration,
  VideoGenerationCancelResult,
  VideoGenerationRetryResult,
} from '@/types/video-generation.types';

export const videoGenerationRepository = {
  async getById(generationId: string): Promise<VideoGeneration> {
    const response = await apiClient.get<VideoGeneration>(`/videos/${generationId}`);
    return response.data;
  },

  /** Re-runs the job; the answer names the row to follow (a new row after a cancel). */
  async retry(generationId: string): Promise<VideoGenerationRetryResult> {
    const response = await apiClient.post<VideoGenerationRetryResult>(
      `/videos/${generationId}/retry`,
    );
    return response.data;
  },

  /** The owner's Cancel. Answers with the status after the call. */
  async cancel(generationId: string): Promise<VideoGenerationCancelResult> {
    const response = await apiClient.post<VideoGenerationCancelResult>(
      `/videos/${generationId}/cancel`,
    );
    return response.data;
  },
};
