import { apiClient } from '@/services/shared/api-client';
import type {
  FeedbackListQuery,
  FeedbackListResponse,
  FeedbackStatusCounts,
  FeedbackTicket,
} from '@/types';

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

export const feedbackAdminRepository = {
  async list(query: FeedbackListQuery): Promise<FeedbackListResponse> {
    const response = await apiClient.get<FeedbackListResponse>(
      '/feedback/admin',
      toStringParams(query as Record<string, unknown>),
    );
    return response.data;
  },

  async stats(): Promise<FeedbackStatusCounts> {
    const response = await apiClient.get<FeedbackStatusCounts>('/feedback/admin/stats');
    return response.data;
  },

  async get(id: string): Promise<FeedbackTicket> {
    const response = await apiClient.get<FeedbackTicket>(`/feedback/admin/${id}`);
    return response.data;
  },

  async updateStatus(id: string, status: string, note?: string): Promise<FeedbackTicket> {
    const response = await apiClient.patch<FeedbackTicket>(`/feedback/admin/${id}/status`, {
      status,
      note,
    });
    return response.data;
  },

  // The attachment stream is authorised per request by the admin endpoint; the
  // underlying object storage URL is never exposed to the browser.
  attachmentPath(id: string, fileId: string): string {
    return `/api/v1/feedback/admin/${id}/attachments/${fileId}`;
  },

  // The attachment endpoint requires ADMIN_FEEDBACK_MANAGE, and a plain
  // <img src="..."> cannot carry the Bearer token — the browser issues that
  // request with no Authorization header, so it answered 401 and every
  // thumbnail rendered as a broken image showing its alt text. Fetching the
  // bytes through apiClient attaches the token; the caller turns the blob into
  // an object URL and revokes it when done.
  async fetchAttachmentBlob(id: string, fileId: string): Promise<Blob> {
    const response = await apiClient.getBlob(`/feedback/admin/${id}/attachments/${fileId}`);
    return response.data;
  },
};
