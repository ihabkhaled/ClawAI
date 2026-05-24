import { useQuery } from '@tanstack/react-query';

import { contextReceiptRepository } from '@/repositories/chat/context-receipt.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ContextReceipt } from '@/types';

export function useContextReceipt(messageId: string | null, enabled: boolean) {
  const query = useQuery<ContextReceipt>({
    queryKey: queryKeys.contextReceipts.byMessage(messageId ?? 'none'),
    queryFn: () => contextReceiptRepository.getReceipt(messageId ?? ''),
    enabled: enabled && messageId !== null && messageId.length > 0,
    retry: false,
  });
  return {
    receipt: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
