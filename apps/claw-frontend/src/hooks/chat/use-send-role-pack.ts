import { useMutation } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import type { SendRolePackPayload, SendRolePackResult, UseSendRolePackResult } from '@/types';

export function useSendRolePack(): UseSendRolePackResult {
  const { mutate, isPending, isError, error, data } = useMutation<
    SendRolePackResult,
    Error,
    SendRolePackPayload
  >({
    mutationFn: (payload: SendRolePackPayload) => chatRepository.sendRolePack(payload),
  });

  return { mutate, isPending, isError, error: error ?? null, data };
}
