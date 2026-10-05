import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { apiClient } from '@/services/shared/api-client';
import type {
  OwnedThreadPublication,
  ThreadPublicationExport,
  ThreadRevisionRequestResult,
  ThreadRevisionReviewState,
  ThreadGenerationState,
} from '@/types/thread-publication.types';
import type { ThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';
import type { ThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

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
  async editRevision(
    publicationId: string,
    request: ThreadRevisionRequest,
  ): Promise<ThreadRevisionRequestResult> {
    const response = await apiClient.post<ThreadRevisionRequestResult>(
      `/thread-publications/${publicationId}/revisions`,
      request,
    );
    return response.data;
  },
  async getRevisionReviewState(
    publicationId: string,
    revisionId: string,
  ): Promise<ThreadRevisionReviewState> {
    const response = await apiClient.get<ThreadRevisionReviewState>(
      `/thread-publications/${publicationId}/revisions/${revisionId}/revalidation-state`,
    );
    return response.data;
  },
  async export(
    publicationId: string,
    format: ThreadPublicationExportFormat,
  ): Promise<ThreadPublicationExport> {
    const response = await apiClient.get<ThreadPublicationExport>(
      `/thread-publications/${publicationId}/export`,
      { format },
    );
    return response.data;
  },
  async unpublish(publicationId: string): Promise<void> {
    await apiClient.post(`/thread-publications/${publicationId}/unpublish`, {});
  },
};
