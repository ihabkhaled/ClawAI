import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { contextPacksRepository } from '@/repositories/context-packs/context-packs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateContextPackRequest } from '@/types';
import { showToast } from '@/utilities';

export function useCreateContextPack() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateContextPackRequest) => contextPacksRepository.createContextPack(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
      showToast.success({ title: t('context.packCreated') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('context.packCreateFailed'));
    },
  });

  return {
    createContextPack: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
