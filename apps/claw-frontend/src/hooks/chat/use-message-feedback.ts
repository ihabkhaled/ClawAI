import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { SetFeedbackParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function useMessageFeedback(threadId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: SetFeedbackParams) =>
      chatRepository.setFeedback(params.messageId, params.feedback),
    onSuccess: () => {
      logger.info({
        component: 'chat',
        action: 'set-feedback',
        message: 'Feedback saved',
        details: { threadId },
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to save feedback');
    },
  });

  return {
    setFeedback: mutation.mutate,
    isPending: mutation.isPending,
  };
}
