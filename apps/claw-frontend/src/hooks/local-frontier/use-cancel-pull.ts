'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullJob } from '@/types/local-frontier.types';

export function useCancelPull(): UseMutationResult<PullJob, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => localFrontierRepository.cancelPull(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.pullJobs() });
    },
  });
}
