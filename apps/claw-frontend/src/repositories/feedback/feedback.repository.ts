import { apiClient } from '@/services/shared/api-client';
import type {
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  FeedbackListQuery,
  FeedbackListResponse,
  FeedbackTicket,
} from '@/types/feedback.types';

function toStringParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}

export const feedbackRepository = {
  async create(payload: CreateFeedbackRequest): Promise<CreateFeedbackResponse> {
    const response = await apiClient.post<CreateFeedbackResponse>('/feedback', payload);
    return response.data;
  },

  async listMine(query: FeedbackListQuery): Promise<FeedbackListResponse> {
    const params = toStringParams(query);
    const url = params ? `/feedback/mine?${params}` : '/feedback/mine';
    const response = await apiClient.get<FeedbackListResponse>(url);
    return response.data;
  },

  async getMine(id: string): Promise<FeedbackTicket> {
    const response = await apiClient.get<FeedbackTicket>(`/feedback/mine/${id}`);
    return response.data;
  },
};
