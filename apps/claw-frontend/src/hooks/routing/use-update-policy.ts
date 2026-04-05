import { useMutation, useQueryClient } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdatePolicyParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdatePolicyParams) => routingRepository.updatePolicy(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
      showToast.success({ title: 'Policy updated' });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to update policy');
    },
  });

  return {
    updatePolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
