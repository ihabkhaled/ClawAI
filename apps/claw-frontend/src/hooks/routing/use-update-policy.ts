import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdatePolicyParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdatePolicyParams) => routingRepository.updatePolicy(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: t('routing.policyUpdated') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('routing.policyUpdateFailed'));
    },
  });

  return {
    updatePolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
