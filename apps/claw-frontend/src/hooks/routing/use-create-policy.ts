import { useMutation, useQueryClient } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreatePolicyRequest } from '@/types';
import { showToast } from '@/utilities';

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreatePolicyRequest) => routingRepository.createPolicy(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: 'Policy created' });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to create policy');
    },
  });

  return {
    createPolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
