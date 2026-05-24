import { useMutation, useQueryClient } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemorySuggestion, RejectSuggestionRequest } from '@/types';

export function useRejectMemorySuggestion() {
  const queryClient = useQueryClient();
  return useMutation<MemorySuggestion, Error, { id: string; data: RejectSuggestionRequest }>({
    mutationFn: ({ id, data }) => memoryRepository.rejectSuggestion(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
  });
}
