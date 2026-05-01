'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';

export function useRefreshCatalog(): UseMutationResult<
  { refreshed: number; failed: number },
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => localFrontierRepository.refreshCatalog(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
