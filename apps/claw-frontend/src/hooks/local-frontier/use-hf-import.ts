'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import type { HfImportRequest, HfImportResponse } from '@/types/hf-search.types';

export function useHfImport(): UseMutationResult<HfImportResponse, Error, HfImportRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HfImportRequest) =>
      localFrontierRepository.importFromHuggingFace(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
    },
  });
}
