import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'chat', action: 'delete-thread-start', message: 'Deleting thread', details: { threadId: id } });
      return chatRepository.deleteThread(id);
    },
    onSuccess: () => {
      logger.info({ component: 'chat', action: 'delete-thread-success', message: 'Thread deleted' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT);
      showToast.success({ title: t('chat.threadDeleted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'chat', action: 'delete-thread-error', message: error.message });
      showToast.apiError(error, t('chat.threadDeleteFailed'));
    },
  });

  return {
    deleteThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
