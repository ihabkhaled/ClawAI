import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'routing', action: 'delete-policy', message: 'Deleting routing policy', details: { policyId: id } });
      return routingRepository.deletePolicy(id);
    },
    onSuccess: () => {
      logger.info({ component: 'routing', action: 'delete-policy-success', message: 'Routing policy deleted' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: t('routing.policyDeleted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'routing', action: 'delete-policy-error', message: error.message });
      showToast.apiError(error, t('routing.policyDeleteFailed'));
    },
  });

  return {
    deletePolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
