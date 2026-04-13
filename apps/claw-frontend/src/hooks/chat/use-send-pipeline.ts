import { useMutation } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import type { SendPipelinePayload, SendPipelineResult, UseSendPipelineResult } from '@/types';

export function useSendPipeline(): UseSendPipelineResult {
  const { mutate, isPending, isError, error, data } = useMutation<
    SendPipelineResult,
    Error,
    SendPipelinePayload
  >({
    mutationFn: (payload: SendPipelinePayload) => chatRepository.sendPipeline(payload),
  });

  return { mutate, isPending, isError, error: error ?? null, data };
}
