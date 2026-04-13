import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type {
  EscalationChainRequest,
  EscalationChainResponse,
  UseEscalationSendResult,
} from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendEscalationChain(): UseEscalationSendResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: EscalationChainRequest): Promise<EscalationChainResponse> => {
      logger.info({
        component: 'escalation',
        action: 'send-escalation-start',
        message: 'Sending escalation chain request',
        details: { chainLength: data.chain.length },
      });
      return chatRepository.sendEscalationChain(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'escalation',
        action: 'send-escalation-success',
        message: 'Escalation chain started, polling for result',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'escalation',
        action: 'send-escalation-error',
        message: error.message,
      });
      showToast.apiError(error, t('escalation.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
