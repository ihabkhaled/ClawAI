import { apiClient } from '@/services/shared/api-client';
import type { ContextPackExportPayload, ContextPackImportResult } from '@/types';

export const contextPackPortableRepository = {
  async exportPack(packId: string): Promise<ContextPackExportPayload> {
    const response = await apiClient.get<ContextPackExportPayload>(
      `/context-packs/${packId}/export`,
    );
    return response.data;
  },

  async importPack(payload: ContextPackExportPayload): Promise<ContextPackImportResult> {
    const response = await apiClient.post<ContextPackImportResult>(
      '/context-packs/import',
      payload,
    );
    return response.data;
  },
};
