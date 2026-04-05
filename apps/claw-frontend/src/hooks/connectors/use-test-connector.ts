import { useMutation, useQueryClient } from '@tanstack/react-query';

import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HealthCheckResponse } from '@/types';
import { showToast } from '@/utilities';

export function useTestConnector() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => connectorRepository.testConnector(id),
    onSuccess: (_data: HealthCheckResponse, id: string) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(id),
      });
      showToast.success({ title: 'Connection test successful' });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Connection test failed');
    },
  });

  return {
    testConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data ?? null,
  };
}
