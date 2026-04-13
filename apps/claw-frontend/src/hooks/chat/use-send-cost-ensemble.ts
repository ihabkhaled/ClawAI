import { useMutation } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import type {
  SendCostEnsemblePayload,
  SendCostEnsembleResult,
  UseSendCostEnsembleResult,
} from '@/types';

export function useSendCostEnsemble(): UseSendCostEnsembleResult {
  const { mutate, data, isPending, isError } = useMutation<
    SendCostEnsembleResult,
    Error,
    SendCostEnsemblePayload
  >({
    mutationFn: (payload) => chatRepository.sendCostEnsemble(payload),
  });

  return {
    send: mutate,
    result: data,
    isPending,
    isError,
  };
}
