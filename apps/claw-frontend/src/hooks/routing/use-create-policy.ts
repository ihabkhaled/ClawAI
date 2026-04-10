import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreatePolicyRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreatePolicyRequest) => {
      logger.info({ component: 'routing', action: 'create-policy', message: 'Creating routing policy', details: { name: data.name, routingMode: data.routingMode } });
      return routingRepository.createPolicy(data);
    },
    onSuccess: () => {
      logger.info({ component: 'routing', action: 'create-policy-success', message: 'Routing policy created' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: t('routing.policyCreated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'routing', action: 'create-policy-error', message: error.message });
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
