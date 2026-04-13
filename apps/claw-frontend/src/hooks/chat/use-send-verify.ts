import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { SendVerifyPayload, SendVerifyResult, UseSendVerifyResult } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendVerify(): UseSendVerifyResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: SendVerifyPayload): Promise<SendVerifyResult> => {
      logger.info({
        component: 'verify',
        action: 'send-verify-start',
        message: 'Sending verify request',
        details: { maxRevisions: data.maxRevisions },
      });
      return chatRepository.sendVerify(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'verify',
        action: 'send-verify-success',
        message: 'Verify started, polling for result',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'verify',
        action: 'send-verify-error',
        message: error.message,
      });
      showToast.apiError(error, t('verify.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
