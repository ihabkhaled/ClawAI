import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useCancelPullJob() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (jobId: string) => ollamaRepository.cancelPullJob(jobId),
    onSuccess: () => {
      logger.debug({
        component: 'catalog',
        action: 'cancel-pull-job',
        message: 'Pull job cancelled',
      });
      showToast.success({ title: 'Download cancelled' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
    },
    onError: () => {
      showToast.error({ title: 'Failed to cancel download' });
    },
  });

  return {
    cancelJob: mutation.mutate,
    isPending: mutation.isPending,
  };
}
