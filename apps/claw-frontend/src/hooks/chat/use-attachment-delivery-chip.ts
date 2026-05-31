import { useFileDelivery } from '@/hooks/chat/use-file-delivery';
import type { FileDeliveryEntry } from '@/types';

// Controller hook for AttachmentDeliveryChip. Encapsulates the Slice D dual-read
// logic so the TSX stays pure-render: when a messageId is present we fetch the
// authoritative `file_delivery_records` rows via TanStack Query; on empty /
// 404 / error we transparently fall back to the inline metadata-mirrored
// delivery array. When no messageId is provided we skip the network round-trip
// entirely and use the inline array (legacy / streaming path).
export function useAttachmentDeliveryChip(
  inlineDelivery: FileDeliveryEntry[],
  messageId?: string,
): FileDeliveryEntry[] {
  const hasMessageId = messageId !== undefined && messageId.length > 0;
  const { entries, error } = useFileDelivery(messageId ?? '', { enabled: hasMessageId });

  if (!hasMessageId) {
    return inlineDelivery;
  }

  if (error !== null && error !== undefined) {
    return inlineDelivery;
  }

  if (entries.length > 0) {
    return entries;
  }

  return inlineDelivery;
}
