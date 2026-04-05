import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ArchiveThreadParams } from '@/types';
import { showToast } from '@/utilities';

export function useArchiveThread() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, isArchived }: ArchiveThreadParams) =>
      chatRepository.updateThread(id, { isArchived }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
      showToast.success({
        title: variables.isArchived ? t('chat.threadArchived') : t('chat.threadUnarchived'),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.archiveFailed'));
    },
  });

  return {
    archiveThread: mutation.mutate,
    isPending: mutation.isPending,
  };
}
