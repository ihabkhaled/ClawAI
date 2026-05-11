import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import {
  deleteAiActionPolicy,
  listAiActionPolicies,
  updateAiActionPolicy,
} from '@/repositories/admin/ai-action-policies.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { AiActionPolicy, UseAiActionPoliciesPageResult } from '@/types/ai-action-policy.types';
import { showToast } from '@/utilities';

export function useAiActionPoliciesPage(): UseAiActionPoliciesPageResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const query = useQuery({
    queryKey: queryKeys.aiActionPolicies.list(),
    queryFn: () => listAiActionPolicies(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; isActive: boolean }) =>
      updateAiActionPolicy(params.id, { isActive: params.isActive }),
    onMutate: (params: { id: string; isActive: boolean }) => {
      setPendingId(params.id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.policies.toggleSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.policies.toggleFailed'));
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiActionPolicy(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.policies.deleteSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.policies.deleteFailed'));
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const onTogglePolicyActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, isActive: next }).catch(() => {
        // surfaced via onError
      });
    },
    [updateMutation],
  );

  const onDeletePolicy = useCallback(
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

  const policies: AiActionPolicy[] = query.data ?? [];

  return {
    policies,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending,
    pendingId,
    mutationError,
    clearMutationError,
    onTogglePolicyActive,
    onDeletePolicy,
  };
}
