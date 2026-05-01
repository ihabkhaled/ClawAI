'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HardwareSnapshot } from '@/types/local-frontier.types';

export function useRefreshHardware(): UseMutationResult<HardwareSnapshot, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => localFrontierRepository.refreshHardware(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.hardware() });
    },
  });
}
