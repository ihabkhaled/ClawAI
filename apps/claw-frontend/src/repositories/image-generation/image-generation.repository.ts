import { apiClient } from '@/services/shared/api-client';
import type { ImageGeneration, ImageGenerationActionResult } from '@/types/image-generation.types';

export const imageGenerationRepository = {
  async getById(generationId: string): Promise<ImageGeneration> {
    const response = await apiClient.get<ImageGeneration>(`/images/${generationId}`);
    return response.data;
  },

  /** Re-runs the row; from a CANCELLED row image-service answers with a NEW successor id. */
  async retry(generationId: string): Promise<ImageGenerationActionResult> {
    const response = await apiClient.post<ImageGenerationActionResult>(
      `/images/${generationId}/retry`,
    );
    return response.data;
  },

  /**
   * The owner's Cancel (pack §72). Always 200 with the status after the call:
   * CANCELLED, or the unchanged final status when the job had already ended.
   * A provider call already in flight is not stopped upstream; its result is
   * discarded and its credit hold released server-side.
   */
  async cancel(generationId: string): Promise<ImageGenerationActionResult> {
    const response = await apiClient.post<ImageGenerationActionResult>(
      `/images/${generationId}/cancel`,
    );
    return response.data;
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
