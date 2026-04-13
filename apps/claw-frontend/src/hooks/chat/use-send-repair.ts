import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { RepairRequest, RepairResponse, UseRepairSendResult } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSendRepair(): UseRepairSendResult {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: RepairRequest): Promise<RepairResponse> => {
      logger.info({
        component: 'repair',
        action: 'send-repair-start',
        message: 'Sending answer repair request',
        details: { repairTypes: data.repairTypes },
      });
      return chatRepository.repairMessage(data);
    },
    onSuccess: (data) => {
      logger.info({
        component: 'repair',
        action: 'send-repair-success',
        message: 'Repair started, polling for result',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'repair',
        action: 'send-repair-error',
        message: error.message,
      });
      showToast.apiError(error, t('repair.sendFailed'));
    },
  });

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
