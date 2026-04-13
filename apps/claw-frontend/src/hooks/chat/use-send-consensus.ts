import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ConsensusRequest, ConsensusResponse, UseConsensusSendResult } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendConsensus(): UseConsensusSendResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: ConsensusRequest): Promise<ConsensusResponse> => {
      logger.info({
        component: 'consensus',
        action: 'send-consensus-start',
        message: 'Sending consensus request',
        details: { modelCount: data.models.length },
      });
      return chatRepository.sendConsensus(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'consensus',
        action: 'send-consensus-success',
        message: 'Consensus started, polling for synthesis',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'consensus',
        action: 'send-consensus-error',
        message: error.message,
      });
      showToast.apiError(error, t('consensus.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
