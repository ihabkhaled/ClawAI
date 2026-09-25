import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MessageSpeechState } from '@/types/message-speech.types';
import { logger } from '@/utilities/logger.utility';
import { shouldCancelMessageSpeech } from '@/utilities/message-speech.utility';

/**
 * The owner's Stop for one reply's read-aloud job (pack §72). Returns a
 * function that asks the backend to stop the job ONLY while it is still
 * GENERATING; the answer (usually CANCELLED, with the parts already made)
 * replaces the cached state, so the poll — which runs only on GENERATING —
 * stops. A failed cancel is logged, never shown: the player is already
 * closing, and the backend job still ends at its own deadline.
 */
export function useCancelMessageSpeech(
  messageId: string,
): (state: MessageSpeechState | undefined) => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => messageSpeechRepository.cancel(messageId),
    onSuccess: (stopped: MessageSpeechState) => {
      queryClient.setQueryData(queryKeys.speech.state(messageId), stopped);
    },
    onError: () => {
      logger.warn({
        component: 'chat',
        action: 'speech-cancel-failed',
        message: 'Read aloud stop request failed',
        details: { messageId },
      });
    },
  });

  return useCallback(
    (state: MessageSpeechState | undefined): void => {
      if (shouldCancelMessageSpeech(state)) {
        mutate();
      }
    },
    [mutate],
  );
}
