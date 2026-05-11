import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
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
import { showToast } from '@/utilities';

export function useSuggestionRulesPage(): UseSuggestionRulesPageResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const query = useQuery({
    queryKey: queryKeys.suggestionRules.list(),
    queryFn: () => listSuggestionRules(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; isActive: boolean }) =>
      updateSuggestionRule(params.id, { isActive: params.isActive }),
    onMutate: (params: { id: string; isActive: boolean }) => {
      setPendingId(params.id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.rules.toggleSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.rules.toggleFailed'));
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSuggestionRule(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.rules.deleteSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.rules.deleteFailed'));
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const onToggleRuleActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, isActive: next }).catch(() => {
        // surfaced via onError
      });
    },
    [updateMutation],
  );

  const onDeleteRule = useCallback(
    (id: string): void => {
      void deleteMutation.mutateAsync(id).catch(() => {
        // surfaced via onError
      });
    },
    [deleteMutation],
  );

  const clearMutationError = useCallback((): void => {
    setMutationError(null);
  }, []);

  const rules: SuggestionTriggerRule[] = query.data ?? [];

  return {
    rules,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending,
    pendingId,
    mutationError,
    clearMutationError,
    onToggleRuleActive,
    onDeleteRule,
  };
}
