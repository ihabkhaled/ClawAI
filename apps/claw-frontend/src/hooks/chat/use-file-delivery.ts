import { useQuery } from '@tanstack/react-query';

import { fileDeliveryRepository } from '@/repositories/chat/file-delivery.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FileDeliveryEntry, UseFileDeliveryOptions, UseFileDeliveryResult } from '@/types';

// TanStack Query wrapper around `GET /chat-messages/:id/file-delivery`. Backs
// the dual-read fallback used by AttachmentDeliveryChip: when a messageId is
// available the chip can fetch fresh, authoritative delivery rows (mirrors the
// `file_delivery_records` table) instead of relying on the inline
// `metadata.fileDelivery` JSON that the parallel orchestrator writes onto the
// assistant message. Returns an empty entries[] when disabled or while loading
// so the chip can fall back to metadata reads without conditional hooks.
export function useFileDelivery(
  messageId: string,
  opts?: UseFileDeliveryOptions,
): UseFileDeliveryResult {
  const enabled = opts?.enabled !== false && messageId.length > 0;
  const query = useQuery<FileDeliveryEntry[]>({
    queryKey: queryKeys.chat.fileDelivery(messageId),
    queryFn: () => fileDeliveryRepository.getFileDeliveryForMessage(messageId),
    enabled,
    retry: false,
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
