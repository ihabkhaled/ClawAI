import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { DecomposeRequest, DecomposeResponse, UseDecomposeSendResult } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendDecompose(): UseDecomposeSendResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: DecomposeRequest): Promise<DecomposeResponse> => {
      logger.info({
        component: 'decompose',
        action: 'send-decompose-start',
        message: 'Sending task decomposition request',
        details: { maxSubTasks: data.maxSubTasks },
      });
      return chatRepository.decomposeTask(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'decompose',
        action: 'send-decompose-success',
        message: 'Decomposition started, polling for result',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'decompose',
        action: 'send-decompose-error',
        message: error.message,
      });
      showToast.apiError(error, t('decompose.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
