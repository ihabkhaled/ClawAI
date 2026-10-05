import { apiClient } from '@/services/shared/api-client';
import type {
  OwnedThreadPublication,
  ThreadGenerationState,
} from '@/types/thread-publication.types';
import type { ThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';

type StartGenerationResponse = { publicationId: string; jobId: string; status: string };

export const threadPublicationsRepository = {
  async listMine(): Promise<OwnedThreadPublication[]> {
    const response = await apiClient.get<OwnedThreadPublication[]>('/thread-publications/mine');
    return response.data;
  },
  async startGeneration(request: ThreadGenerationRequest): Promise<StartGenerationResponse> {
    const response = await apiClient.post<StartGenerationResponse>(
      '/thread-publications/generations',
      request,
    );
    return response.data;
  },
  async getGenerationState(publicationId: string): Promise<ThreadGenerationState> {
    const response = await apiClient.get<ThreadGenerationState>(
      `/thread-publications/${publicationId}/generation-state`,
    );
    return response.data;
  },
  async cancelGeneration(publicationId: string): Promise<void> {
    await apiClient.post(`/thread-publications/${publicationId}/cancel-generation`, {});
  },
  async publish(publicationId: string): Promise<void> {
    await apiClient.post(`/thread-publications/${publicationId}/publish`, {});
  },
};
