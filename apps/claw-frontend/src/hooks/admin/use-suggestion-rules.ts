import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  deleteSuggestionRule,
  listSuggestionRules,
  updateSuggestionRule,
} from '@/repositories/admin/ai-action-policies.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  SuggestionTriggerRule,
  UseSuggestionRulesPageResult,
} from '@/types/ai-action-policy.types';

export function useSuggestionRulesPage(): UseSuggestionRulesPageResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.suggestionRules.list(),
    queryFn: () => listSuggestionRules(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; isActive: boolean }) =>
      updateSuggestionRule(params.id, { isActive: params.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSuggestionRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
  });

  const onToggleRuleActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, isActive: next });
    },
    [updateMutation],
  );

  const onDeleteRule = useCallback(
    (id: string): void => {
      void deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const rules: SuggestionTriggerRule[] = query.data ?? [];

  return {
    rules,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending,
    onToggleRuleActive,
    onDeleteRule,
  };
}
