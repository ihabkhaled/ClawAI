import { apiClient } from '@/services/shared/api-client';
import type { ContextReceipt, PreviewContextRequest, RetrievalBundle } from '@/types';

export const contextReceiptRepository = {
  async getReceipt(messageId: string): Promise<ContextReceipt> {
    const response = await apiClient.get<ContextReceipt>(
      `/chat-messages/${messageId}/context-receipt`,
    );
    return response.data;
  },

  async previewContext(threadId: string, data: PreviewContextRequest): Promise<RetrievalBundle> {
    const response = await apiClient.post<RetrievalBundle>(
      `/chat-threads/${threadId}/preview-context`,
      data,
    );
    return response.data;
  },
};
