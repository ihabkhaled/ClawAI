'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import type { UpdateRuntimeConfigArgs } from '@/types/local-frontier-mutations.types';
import type { RuntimeConfig, UpdateRuntimeConfigPayload } from '@/types/local-frontier.types';

export function useUpdateRuntimeConfig(): UseMutationResult<
  RuntimeConfig,
  Error,
  UpdateRuntimeConfigArgs
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, payload }: UpdateRuntimeConfigArgs) =>
      localFrontierRepository.updateRuntimeConfig(modelId, payload satisfies UpdateRuntimeConfigPayload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
