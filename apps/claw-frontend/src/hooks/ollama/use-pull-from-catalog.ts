import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function usePullFromCatalog() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (catalogId: string) => ollamaRepository.pullFromCatalog(catalogId),
    onSuccess: async () => {
      logger.debug({ component: 'catalog', action: 'pull-started', message: 'Pull job started' });
      showToast.success({ title: t('catalog.downloadStarted') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.localModels.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
    onError: () => {
      showToast.error({ title: t('catalog.downloadStartFailed') });
    },
  });

  return {
    pullFromCatalog: mutation.mutate,
    isPending: mutation.isPending,
  };
}
