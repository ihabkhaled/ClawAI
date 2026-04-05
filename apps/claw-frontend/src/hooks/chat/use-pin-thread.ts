import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PinThreadParams } from '@/types';
import { showToast } from '@/utilities';

export function usePinThread() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, isPinned }: PinThreadParams) =>
      chatRepository.updateThread(id, { isPinned }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
      showToast.success({
        title: variables.isPinned ? t('chat.threadPinned') : t('chat.threadUnpinned'),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.pinFailed'));
    },
  });

  return {
    pinThread: mutation.mutate,
    isPending: mutation.isPending,
  };
}
