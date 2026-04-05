import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { showToast } from '@/utilities';

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => routingRepository.deletePolicy(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: t('routing.policyDeleted') });
    },
    onError: (error: Error) => {
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
