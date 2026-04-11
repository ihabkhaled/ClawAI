import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function usePullFromCatalog() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (catalogId: string) => ollamaRepository.pullFromCatalog(catalogId),
    onSuccess: async () => {
      logger.debug({ component: 'catalog', action: 'pull-started', message: 'Pull job started' });
      showToast.success({ title: 'Model download started' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.localModels.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
    onError: () => {
      showToast.error({ title: 'Failed to start model download' });
    },
  });

  return {
    pullFromCatalog: mutation.mutate,
    isPending: mutation.isPending,
  };
}
