import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { apiClient } from '@/services/shared/api-client';
import type {
  OwnedThreadPublication,
  ThreadPublicationExport,
  ThreadRevisionRequestResult,
  ThreadRevisionReviewState,
  ThreadGenerationState,
  ThreadPublicationChangeRequest,
  ThreadPublicationChangeRequestResolution,
  ResolveThreadPublicationChangeRequest,
  PublicThreadPublication,
  PublicThreadComment,
  ThreadReactionSummary,
  ThreadReportReason,
} from '@/types/thread-publication.types';
import type { ThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';
import type { ThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

type StartGenerationResponse = { publicationId: string; jobId: string; status: string };
type CancelGenerationResponse = { publicationId: string; status: 'CANCEL_REQUESTED' };
type PublicReportRequest = {
  commentId?: string;
  reason: ThreadReportReason;
  details?: string;
};

export const threadPublicationsRepository = {
  async getPublic(slug: string): Promise<PublicThreadPublication> {
    const response = await apiClient.get<PublicThreadPublication>(
      `/thread-publications/public/${encodeURIComponent(slug)}`,
    );
    return response.data;
  },
  async listPublicComments(slug: string): Promise<PublicThreadComment[]> {
    const response = await apiClient.get<PublicThreadComment[]>(
      `/thread-publications/public/${encodeURIComponent(slug)}/comments`,
    );
    return response.data;
  },
  async getPublicReactionSummary(slug: string): Promise<ThreadReactionSummary> {
    const response = await apiClient.get<ThreadReactionSummary>(
      `/thread-publications/public/${encodeURIComponent(slug)}/reactions`,
    );
    return response.data;
  },
  async addPublicComment(slug: string, request: { content: string }): Promise<PublicThreadComment> {
    const response = await apiClient.post<PublicThreadComment>(
      `/thread-publications/public/${encodeURIComponent(slug)}/comments`,
      request,
    );
    return response.data;
  },
  async setPublicReaction(
    slug: string,
    request: { value: ThreadPublicationReaction },
  ): Promise<ThreadReactionSummary> {
    const response = await apiClient.post<ThreadReactionSummary>(
      `/thread-publications/public/${encodeURIComponent(slug)}/reactions`,
      request,
    );
    return response.data;
  },
  async removePublicReaction(slug: string): Promise<ThreadReactionSummary> {
    const response = await apiClient.delete<ThreadReactionSummary>(
      `/thread-publications/public/${encodeURIComponent(slug)}/reactions`,
    );
    return response.data;
  },
  async requestPublicChange(slug: string, request: { suggestion: string }): Promise<void> {
    await apiClient.post(
      `/thread-publications/public/${encodeURIComponent(slug)}/change-requests`,
      {
        ...request,
      },
    );
  },
  async reportPublicPublication(slug: string, request: PublicReportRequest): Promise<void> {
    await apiClient.post(
      `/thread-publications/public/${encodeURIComponent(slug)}/reports`,
      request,
    );
  },
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
      `/thread-publications/${encodeURIComponent(publicationId)}/generation-state`,
    );
    return response.data;
  },
  async cancelGeneration(publicationId: string): Promise<CancelGenerationResponse> {
    const response = await apiClient.post<CancelGenerationResponse>(
      `/thread-publications/${encodeURIComponent(publicationId)}/cancel-generation`,
      {},
    );
    return response.data;
  },
  async publish(publicationId: string): Promise<void> {
    await apiClient.post(`/thread-publications/${encodeURIComponent(publicationId)}/publish`, {});
  },
  async editRevision(
    publicationId: string,
    request: ThreadRevisionRequest,
  ): Promise<ThreadRevisionRequestResult> {
    const response = await apiClient.post<ThreadRevisionRequestResult>(
      `/thread-publications/${encodeURIComponent(publicationId)}/revisions`,
      request,
    );
    return response.data;
  },
  async getRevisionReviewState(
    publicationId: string,
    revisionId: string,
  ): Promise<ThreadRevisionReviewState> {
    const response = await apiClient.get<ThreadRevisionReviewState>(
      `/thread-publications/${encodeURIComponent(publicationId)}/revisions/${encodeURIComponent(revisionId)}/revalidation-state`,
    );
    return response.data;
  },
  async listChangeRequests(publicationId: string): Promise<ThreadPublicationChangeRequest[]> {
    const response = await apiClient.get<ThreadPublicationChangeRequest[]>(
      `/thread-publications/${encodeURIComponent(publicationId)}/change-requests`,
    );
    return response.data;
  },
  async resolveChangeRequest(
    publicationId: string,
    requestId: string,
    request: ResolveThreadPublicationChangeRequest,
  ): Promise<ThreadPublicationChangeRequestResolution> {
    const response = await apiClient.post<ThreadPublicationChangeRequestResolution>(
      `/thread-publications/${encodeURIComponent(publicationId)}/change-requests/${encodeURIComponent(requestId)}`,
      request,
    );
    return response.data;
  },
  async export(
    publicationId: string,
    format: ThreadPublicationExportFormat,
  ): Promise<ThreadPublicationExport> {
    const response = await apiClient.get<ThreadPublicationExport>(
      `/thread-publications/${encodeURIComponent(publicationId)}/export`,
      { format },
    );
    return response.data;
  },
  async unpublish(publicationId: string): Promise<void> {
    await apiClient.post(`/thread-publications/${encodeURIComponent(publicationId)}/unpublish`, {});
  },
};
