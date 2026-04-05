import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullModelRequest } from '@/types';
import { showToast } from '@/utilities';

export function usePullModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: PullModelRequest) => ollamaRepository.pullModel(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
      showToast.success({ title: t('models.modelPullStarted') });
    },
    onError: (error: Error) => {
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
