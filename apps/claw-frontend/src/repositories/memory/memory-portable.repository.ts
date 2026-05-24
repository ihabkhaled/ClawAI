import { apiClient } from '@/services/shared/api-client';
import type { MemoryImportResult } from '@/types';

export const memoryPortableRepository = {
  async exportNdjson(): Promise<string> {
    const response = await apiClient.get<string>('/memories-portable/export');
    return response.data;
  },

  async importNdjson(ndjson: string): Promise<MemoryImportResult> {
    const response = await apiClient.post<MemoryImportResult>('/memories-portable/import', {
      ndjson,
    });
    return response.data;
  },
};
