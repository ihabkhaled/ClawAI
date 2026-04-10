import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { contextPacksRepository } from '@/repositories/context-packs/context-packs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateContextPackRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useCreateContextPack() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateContextPackRequest) => {
      logger.info({ component: 'memory', action: 'create-context-pack', message: 'Creating context pack', details: { name: data.name } });
      return contextPacksRepository.createContextPack(data);
    },
    onSuccess: () => {
      logger.info({ component: 'memory', action: 'create-context-pack-success', message: 'Context pack created' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
      showToast.success({ title: t('context.packCreated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'memory', action: 'create-context-pack-error', message: error.message });
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
