import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useCancelPullJob() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (jobId: string) => ollamaRepository.cancelPullJob(jobId),
    onSuccess: async () => {
      logger.debug({
        component: 'catalog',
        action: 'cancel-pull-job',
        message: 'Pull job cancelled',
      });
      showToast.success({ title: t('catalog.downloadCancelled') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
    onError: () => {
      showToast.error({ title: t('catalog.cancelDownloadFailed') });
    },
  });

  return {
    cancelJob: mutation.mutate,
    isPending: mutation.isPending,
  };
}
