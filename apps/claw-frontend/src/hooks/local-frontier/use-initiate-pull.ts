'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { InitiatePullArgs } from '@/types/local-frontier-mutations.types';
import type { PullJobCreateResult } from '@/types/local-frontier.types';

export function useInitiatePull(): UseMutationResult<PullJobCreateResult, Error, InitiatePullArgs> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, overrideHardwareGate }: InitiatePullArgs) =>
      localFrontierRepository.initiatePull(modelId, overrideHardwareGate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.pullJobs() });
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
