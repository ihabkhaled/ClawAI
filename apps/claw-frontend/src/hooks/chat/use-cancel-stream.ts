import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { logger, showToast } from '@/utilities';
import { useTranslation } from '@/lib/i18n';

// Cancels the in-flight streaming run for a thread. The backend aborts the
// provider connection; partial output already streamed is preserved.
export function useCancelStream(threadId: string) {
  const { t } = useTranslation();
  const mutation = useMutation({
    mutationFn: () => chatRepository.cancelStream(threadId),
    onError: (error) => {
      logger.error({
        component: 'chat',
        action: 'cancel-stream-error',
        message: 'Failed to cancel stream',
        details: { threadId },
      });
      showToast.apiError(error, t('chat.stream.cancelFailed'));
    },
  });

  const cancel = useCallback((): void => {
    mutation.mutate();
  }, [mutation]);

  return { cancel, isCancelling: mutation.isPending };
}
