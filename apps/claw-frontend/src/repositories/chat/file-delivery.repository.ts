import { FileDeliveryMode } from '@/enums';
import { apiClient } from '@/services/shared/api-client';
import type { FileDeliveryEntry, FileDeliveryRecordWire } from '@/types';

export const fileDeliveryRepository = {
  async getFileDeliveryForMessage(messageId: string): Promise<FileDeliveryEntry[]> {
    const response = await apiClient.get<FileDeliveryRecordWire[]>(
      `/chat-messages/${messageId}/file-delivery`,
    );
    const entries: FileDeliveryEntry[] = [];
    for (const record of response.data) {
      const mode = record.mode;
      if (
        mode !== FileDeliveryMode.EXTRACTED_TEXT &&
        mode !== FileDeliveryMode.NATIVE_IMAGE &&
        mode !== FileDeliveryMode.OMITTED_NO_VISION &&
        mode !== FileDeliveryMode.OMITTED_UNSUPPORTED &&
        mode !== FileDeliveryMode.TRUNCATED_TEXT
      ) {
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
