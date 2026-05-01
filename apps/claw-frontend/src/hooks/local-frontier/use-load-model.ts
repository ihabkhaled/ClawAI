'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { LoadedModel } from '@/types/local-frontier.types';

export function useLoadModel(): UseMutationResult<LoadedModel, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => localFrontierRepository.loadModel(modelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.loadedModel() });
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}

export function useUnloadModel(): UseMutationResult<{ unloaded: boolean }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => localFrontierRepository.unloadModel(modelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localFrontier.loadedModel() });
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
