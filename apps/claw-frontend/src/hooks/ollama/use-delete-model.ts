import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeleteModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (modelId: string) => ollamaRepository.deleteModel(modelId),
    onSuccess: async () => {
      logger.debug({ component: 'catalog', action: 'model-deleted', message: 'Model deleted' });
      showToast.success({ title: t('catalog.modelRemoved') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.localModels.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
    },
    onError: () => {
      showToast.error({ title: t('catalog.modelRemoveFailed') });
    },
  });

  return {
    deleteModel: mutation.mutate,
    isPending: mutation.isPending,
  };
}
