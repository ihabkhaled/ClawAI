import { useState } from "react";

import type {
  RoutingPolicy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from "@/types";

import { useRoutingPolicies } from "./use-routing-policies";
import { useCreatePolicy } from "./use-create-policy";
import { useUpdatePolicy } from "./use-update-policy";
import { useDeletePolicy } from "./use-delete-policy";

export function useRoutingPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | null>(
    null,
  );

  const { policies, total, isLoading, isError, error } =
    useRoutingPolicies();
  const { createPolicy, isPending: isCreatePending } = useCreatePolicy();
  const { updatePolicy, isPending: isUpdatePending } = useUpdatePolicy();
  const { deletePolicy, isPending: isDeletePending } = useDeletePolicy();

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (policy: RoutingPolicy) => {
    setEditingPolicy(policy);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: CreatePolicyRequest) => {
    if (editingPolicy) {
      const updateData: UpdatePolicyRequest = { ...data };
      updatePolicy(
        { id: editingPolicy.id, data: updateData },
        { onSuccess: () => setIsFormOpen(false) },
      );
    } else {
      createPolicy(data, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const handleToggleActive = (policy: RoutingPolicy) => {
    updatePolicy({
      id: policy.id,
      data: { isActive: !policy.isActive },
    });
  };

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
