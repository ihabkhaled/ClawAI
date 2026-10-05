import { apiClient } from '@/services/shared/api-client';
import type { OwnedThreadPublication } from '@/types/thread-publication.types';

export const threadPublicationsRepository = {
  async listMine(): Promise<OwnedThreadPublication[]> {
    const response = await apiClient.get<OwnedThreadPublication[]>('/thread-publications/mine');
    return response.data;
  },
};
