'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullJobCreateResult } from '@/types/local-frontier.types';

export function useRetryPull(): UseMutationResult<PullJobCreateResult, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => localFrontierRepository.retryPull(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.pullJobs() });
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
