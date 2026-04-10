import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullModelRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function usePullModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: PullModelRequest) => {
      logger.info({ component: 'connectors', action: 'pull-model', message: 'Pulling model', details: { modelName: data.modelName, runtime: data.runtime } });
      return ollamaRepository.pullModel(data);
    },
    onSuccess: () => {
      logger.info({ component: 'connectors', action: 'pull-model-success', message: 'Model pull started' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
      showToast.success({ title: t('models.modelPullStarted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'pull-model-error', message: error.message });
      showToast.apiError(error, t('models.modelPullFailed'));
    },
  });

  return {
    pullModel: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
