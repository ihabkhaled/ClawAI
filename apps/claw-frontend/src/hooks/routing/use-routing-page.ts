import { useCallback, useState } from 'react';

import type { RoutingPolicy, CreatePolicyRequest, UpdatePolicyRequest } from '@/types';

import { useCreatePolicy } from './use-create-policy';
import { useDeletePolicy } from './use-delete-policy';
import { useRoutingPolicies } from './use-routing-policies';
import { useUpdatePolicy } from './use-update-policy';

export function useRoutingPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | null>(null);

  const { policies, total, isLoading, isError, error } = useRoutingPolicies();
  const { createPolicy, isPending: isCreatePending } = useCreatePolicy();
  const { updatePolicy, isPending: isUpdatePending } = useUpdatePolicy();
  const { deletePolicy, isPending: isDeletePending } = useDeletePolicy();

  const handleOpenCreate = useCallback(() => {
    setEditingPolicy(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((policy: RoutingPolicy) => {
    setEditingPolicy(policy);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CreatePolicyRequest) => {
      if (editingPolicy) {
        const updateData: UpdatePolicyRequest = { ...data };
        updatePolicy(
          { id: editingPolicy.id, data: updateData },
          { onSuccess: () => setIsFormOpen(false) },
        );
      } else {
        createPolicy(data, { onSuccess: () => setIsFormOpen(false) });
      }
    },
    [editingPolicy, updatePolicy, createPolicy],
  );

  const handleToggleActive = useCallback(
    (policy: RoutingPolicy) => {
      updatePolicy({
        id: policy.id,
        data: { isActive: !policy.isActive },
      });
    },
    [updatePolicy],
  );

  return {
    policies,
    total,
    isLoading,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    editingPolicy,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    handleToggleActive,
    isFormPending: isCreatePending || isUpdatePending,
    deletePolicy,
    isDeletePending,
  };
}
