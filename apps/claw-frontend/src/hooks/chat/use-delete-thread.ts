import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { showToast } from '@/utilities';

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => chatRepository.deleteThread(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT);
      showToast.success({ title: t('chat.threadDeleted') });
    },
    onError: (error: Error) => {
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
