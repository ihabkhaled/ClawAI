import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateThreadRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useCreateThread() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateThreadRequest) => chatRepository.createThread(data),
    onSuccess: (thread) => {
      logger.info({ component: 'chat', action: 'create-thread', message: 'Thread created', details: { threadId: thread.id } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT_THREAD(thread.id));
      showToast.success({ title: t('chat.threadCreated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'chat', action: 'create-thread-error', message: error.message });
      showToast.apiError(error, t('chat.threadCreateFailed'));
    },
  });

  return {
    createThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
