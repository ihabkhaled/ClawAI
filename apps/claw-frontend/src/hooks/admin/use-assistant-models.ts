import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { assistantModelsRepository } from '@/repositories/admin/assistant-models.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AssistantModelInput,
  UseAssistantModelsResult,
} from '@/types/smart-router-admin.types';

/**
 * The configured candidates for one assistant model role.
 *
 * Replace is declarative — the whole list, in order — so add, remove and
 * reorder are a single request that cannot leave the role half-updated.
 */
export function useAssistantModels(role: string): UseAssistantModelsResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.assistantModels(role),
    queryFn: () => assistantModelsRepository.listByRole(role),
  });

  const mutation = useMutation({
    mutationFn: (entries: readonly AssistantModelInput[]) =>
      assistantModelsRepository.replaceRole(role, { entries }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartRouterAdmin.assistantModels(role),
      });
    },
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    replace: (entries: readonly AssistantModelInput[]) => mutation.mutate(entries),
    isReplacePending: mutation.isPending,
  };
}
