'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

interface DeleteArgs {
  modelId: string;
  confirmName: string;
}

export function useDeleteWeights(): UseMutationResult<{ deleted: boolean }, Error, DeleteArgs> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, confirmName }: DeleteArgs) =>
      localFrontierRepository.deleteWeights(modelId, confirmName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.loadedModel() });
    },
  });
}
