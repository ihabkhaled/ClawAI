import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { BestOfNRequest, BestOfNResponse, UseBestOfNSendResult } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendBestOfN(): UseBestOfNSendResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: BestOfNRequest): Promise<BestOfNResponse> => {
      logger.info({
        component: 'best-of-n',
        action: 'send-best-of-n-start',
        message: 'Sending Best-of-N generation request',
        details: { n: data.n },
      });
      return chatRepository.bestOfNMessage(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'best-of-n',
        action: 'send-best-of-n-success',
        message: 'Best-of-N started, polling for result',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'best-of-n',
        action: 'send-best-of-n-error',
        message: error.message,
      });
      showToast.apiError(error, t('bestOfN.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
