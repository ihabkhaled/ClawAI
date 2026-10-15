import type { ThreadFormatPreview } from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';

export const threadFormatRepository = {
  /** Asks for a formatted preview of the Thread's latest revision. Nothing is saved or published. */
  async preview(
    publicationId: string,
    request: { idempotencyKey: string; correlationId: string },
  ): Promise<ThreadFormatPreview> {
    const response = await apiClient.post<ThreadFormatPreview>(
      `/thread-publications/${encodeURIComponent(publicationId)}/format-preview`,
      request,
    );
    return response.data;
  },
};
