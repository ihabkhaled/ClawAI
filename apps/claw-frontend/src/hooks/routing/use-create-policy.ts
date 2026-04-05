import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreatePolicyRequest } from '@/types';
import { showToast } from '@/utilities';

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreatePolicyRequest) => routingRepository.createPolicy(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: t('routing.policyCreated') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('routing.policyCreateFailed'));
    },
  });

  return {
    createPolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
