import { useMutation } from '@tanstack/react-query';

import { contextReceiptRepository } from '@/repositories/chat/context-receipt.repository';
import type { PreviewContextRequest, RetrievalBundle } from '@/types';

export function usePreviewContext(threadId: string) {
  return useMutation<RetrievalBundle, Error, PreviewContextRequest>({
    mutationFn: (data) => contextReceiptRepository.previewContext(threadId, data),
  });
}
