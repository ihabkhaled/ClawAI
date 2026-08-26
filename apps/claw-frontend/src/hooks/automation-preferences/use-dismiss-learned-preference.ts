import { useMutation, useQueryClient } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseDismissLearnedPreferenceReturn } from '@/types/automation-preference.types';

// Phase 11 — a learned preference is a Memory row under the hood
// (type=PREFERENCE), so "dismiss" reuses the existing toggle endpoint
// (isEnabled: true -> false) rather than introducing a new one.
export function useDismissLearnedPreference(): UseDismissLearnedPreferenceReturn {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => memoryRepository.toggleMemory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learnedPreferences.all });
    },
  });
  return {
    dismiss: mutation.mutate,
    isPending: mutation.isPending,
    pendingId: mutation.variables ?? null,
  };
}
