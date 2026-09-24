import { apiClient } from '@/services/shared/api-client';
import type { FileDeliveryEntry, FileDeliveryRecordWire } from '@/types';
import { isFileDeliveryMode } from '@/utilities/file-delivery.utility';

export const fileDeliveryRepository = {
  async getFileDeliveryForMessage(messageId: string): Promise<FileDeliveryEntry[]> {
    const response = await apiClient.get<FileDeliveryRecordWire[]>(
      `/chat-messages/${messageId}/file-delivery`,
    );
    const entries: FileDeliveryEntry[] = [];
    for (const record of response.data) {
      const mode = record.mode;
      if (!isFileDeliveryMode(mode)) {
        continue;
      }
      entries.push({
        fileId: record.fileId,
        filename: record.filename,
        mimeType: record.mimeType,
        provider: record.provider,
        model: record.model,
        mode,
      });
    }
    return entries;
  },
};
