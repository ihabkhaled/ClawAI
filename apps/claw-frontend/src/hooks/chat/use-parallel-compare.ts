import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ParallelRequest, ParallelResponse } from '@/types';
import { logger, showToast } from '@/utilities';

export function useParallelCompare(): {
  send: (data: ParallelRequest) => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  isError: boolean;
} {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: ParallelRequest) => {
      logger.info({
        component: 'parallel-compare',
        action: 'send-parallel-start',
        message: 'Sending parallel compare request',
        details: { modelCount: data.models.length },
      });
      return chatRepository.sendParallel(data);
    },
    onSuccess: () => {
      logger.info({
        component: 'parallel-compare',
        action: 'send-parallel-success',
        message: 'Parallel compare completed',
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'parallel-compare',
        action: 'send-parallel-error',
        message: error.message,
      });
      showToast.apiError(error, t('compare.compareFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
