import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import {
  createAiActionPolicy,
  deleteAiActionPolicy,
  listAiActionPolicies,
  updateAiActionPolicy,
} from '@/repositories/admin/ai-action-policies.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AiActionPolicy,
  CreateAiActionPolicyRequest,
  UpdateAiActionPolicyRequest,
  UseAiActionPoliciesPageResult,
} from '@/types/ai-action-policy.types';
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
    mutationFn: (params: { id: string; payload: UpdateAiActionPolicyRequest }) =>
      updateAiActionPolicy(params.id, params.payload),
    onMutate: (params: { id: string; payload: UpdateAiActionPolicyRequest }) => {
      setPendingId(params.id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.policies.updateSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.policies.updateFailed'));
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

  const createMutation = useMutation({
    mutationFn: (payload: CreateAiActionPolicyRequest) => createAiActionPolicy(payload),
    onMutate: () => {
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminAutomation.policies.createSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiActionPolicies.list() });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminAutomation.policies.createFailed'));
    },
  });

  const onTogglePolicyActive = useCallback(
    (id: string, next: boolean): void => {
      void updateMutation.mutateAsync({ id, payload: { isActive: next } }).catch(() => {
        // surfaced via onError
      });
    },
    [updateMutation],
  );

  const onCreatePolicy = useCallback(
    (payload: CreateAiActionPolicyRequest): Promise<AiActionPolicy | null> =>
      createMutation
        .mutateAsync(payload)
        .then((p) => p)
        .catch(() => null),
    [createMutation],
  );

  const onUpdatePolicy = useCallback(
    (id: string, payload: UpdateAiActionPolicyRequest): Promise<AiActionPolicy | null> =>
      updateMutation
        .mutateAsync({ id, payload })
        .then((p) => p)
        .catch(() => null),
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

  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  const [dialogOpen, setDialogOpenInternal] = useState<boolean>(false);
  const [editing, setEditing] = useState<AiActionPolicy | null>(null);

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

  const openEdit = useCallback((policy: AiActionPolicy): void => {
    setEditing(policy);
    setDialogOpenInternal(true);
  }, []);

  const submitCreate = useCallback(
    (payload: CreateAiActionPolicyRequest): void => {
      void onCreatePolicy(payload).then((created) => {
        if (created !== null) {
          setDialogOpenInternal(false);
          setEditing(null);
        }
      });
    },
    [onCreatePolicy],
  );

  const submitUpdate = useCallback(
    (payload: UpdateAiActionPolicyRequest): void => {
      if (editing === null) {
        return;
      }
      void onUpdatePolicy(editing.id, payload).then((updated) => {
        if (updated !== null) {
          setDialogOpenInternal(false);
          setEditing(null);
        }
      });
    },
    [editing, onUpdatePolicy],
  );

  const policies: AiActionPolicy[] = query.data ?? [];

  return {
    policies,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isMutating: updateMutation.isPending || deleteMutation.isPending || createMutation.isPending,
    pendingId,
    mutationError,
    clearMutationError,
    isCreating: createMutation.isPending,
    onCreatePolicy,
    onUpdatePolicy,
    onTogglePolicyActive,
    onDeletePolicy,
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
