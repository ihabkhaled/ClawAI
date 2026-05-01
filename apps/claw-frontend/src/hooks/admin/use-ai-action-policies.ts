import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  deleteAiActionPolicy,
  listAiActionPolicies,
  updateAiActionPolicy,
} from '@/repositories/admin/ai-action-policies.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AiActionPolicy,
  UseAiActionPoliciesPageResult,
} from '@/types/ai-action-policy.types';

export function useAiActionPoliciesPage(): UseAiActionPoliciesPageResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.aiActionPolicies.list(),
    queryFn: () => listAiActionPolicies(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; isActive: boolean }) =>
      updateAiActionPolicy(params.id, { isActive: params.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiActionPolicy(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
  });

  const onTogglePolicyActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, isActive: next });
    },
    [updateMutation],
  );

  const onDeletePolicy = useCallback(
    (id: string): void => {
      void deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const policies: AiActionPolicy[] = query.data ?? [];

  return {
    policies,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending,
    onTogglePolicyActive,
    onDeletePolicy,
  };
}
