import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import {
  createSuggestionRule,
  deleteSuggestionRule,
  listSuggestionRules,
  updateSuggestionRule,
} from '@/repositories/admin/ai-action-policies.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreateSuggestionTriggerRuleRequest,
  SuggestionTriggerRule,
  UpdateSuggestionTriggerRuleRequest,
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
    mutationFn: (params: { id: string; payload: UpdateSuggestionTriggerRuleRequest }) =>
      updateSuggestionRule(params.id, params.payload),
    onMutate: (params: { id: string; payload: UpdateSuggestionTriggerRuleRequest }) => {
      setPendingId(params.id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.rules.updateSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.rules.updateFailed'));
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

  const createMutation = useMutation({
    mutationFn: (payload: CreateSuggestionTriggerRuleRequest) => createSuggestionRule(payload),
    onMutate: () => {
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.rules.createSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestionRules.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.rules.createFailed'));
    },
  });

  const onToggleRuleActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, payload: { isActive: next } }).catch(() => {
        // surfaced via onError
      });
    },
    [updateMutation],
  );

  const onCreateRule = useCallback(
    (payload: CreateSuggestionTriggerRuleRequest): Promise<SuggestionTriggerRule | null> =>
      createMutation
        .mutateAsync(payload)
        .then((r) => r)
        .catch(() => null),
    [createMutation],
  );

  const onUpdateRule = useCallback(
    (
      id: string,
      payload: UpdateSuggestionTriggerRuleRequest,
    ): Promise<SuggestionTriggerRule | null> =>
      updateMutation
        .mutateAsync({ id, payload })
        .then((r) => r)
        .catch(() => null),
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

  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  const [dialogOpen, setDialogOpenInternal] = useState<boolean>(false);
  const [editing, setEditing] = useState<SuggestionTriggerRule | null>(null);

  const setDialogOpen = useCallback((open: boolean): void => {
    setDialogOpenInternal(open);
    if (!open) {
      setEditing(null);
    }
  }, []);

  const openCreate = useCallback((): void => {
    setEditing(null);
    setDialogOpenInternal(true);
  }, []);

  const openEdit = useCallback((rule: SuggestionTriggerRule): void => {
    setEditing(rule);
    setDialogOpenInternal(true);
  }, []);

  const submitCreate = useCallback(
    (payload: CreateSuggestionTriggerRuleRequest): void => {
      void onCreateRule(payload).then((created) => {
        if (created !== null) {
          setDialogOpenInternal(false);
          setEditing(null);
        }
      });
    },
    [onCreateRule],
  );

  const submitUpdate = useCallback(
    (payload: UpdateSuggestionTriggerRuleRequest): void => {
      if (editing === null) {
        return;
      }
      void onUpdateRule(editing.id, payload).then((updated) => {
        if (updated !== null) {
          setDialogOpenInternal(false);
          setEditing(null);
        }
      });
    },
    [editing, onUpdateRule],
  );

  const rules: SuggestionTriggerRule[] = query.data ?? [];

  return {
    rules,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending || createMutation.isPending,
    pendingId,
    mutationError,
    clearMutationError,
    isCreating: createMutation.isPending,
    onCreateRule,
    onUpdateRule,
    onToggleRuleActive,
    onDeleteRule,
    onRetry,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    submitCreate,
    submitUpdate,
  };
}
