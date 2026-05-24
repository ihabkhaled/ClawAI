import { useMutation, useQueryClient } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ApproveSuggestionRequest, MemoryRecord } from '@/types';

export function useApproveMemorySuggestion() {
  const queryClient = useQueryClient();
  return useMutation<MemoryRecord, Error, { id: string; data: ApproveSuggestionRequest }>({
    mutationFn: ({ id, data }) => memoryRepository.approveSuggestion(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
  });
}
