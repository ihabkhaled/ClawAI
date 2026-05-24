import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemoryPreference, UpsertMemoryPreferenceRequest } from '@/types';

export function useMemoryPreferences() {
  const query = useQuery<MemoryPreference>({
    queryKey: queryKeys.memory.preferences(),
    queryFn: () => memoryRepository.getPreferences(),
  });
  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useUpsertMemoryPreferences() {
  const queryClient = useQueryClient();
  return useMutation<MemoryPreference, Error, UpsertMemoryPreferenceRequest>({
    mutationFn: (data) => memoryRepository.upsertPreferences(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.preferences() });
    },
  });
}
