import { useCallback, useState } from 'react';

import { useAssignPlanDialogState } from '@/hooks/admin/use-assign-plan-dialog-state';
import type { AdminUser, AdminUserUpdateRequest, UseUserTableStateReturn } from '@/types';

export function useUserTableState(): UseUserTableStateReturn {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [temporaryPasswordUserId, setTemporaryPasswordUserId] = useState<string | null>(null);
  const assignPlan = useAssignPlanDialogState();

  const handleRoleSelect = useCallback(
    (userId: string, role: string, onChangeRole: (userId: string, role: string) => void): void => {
      onChangeRole(userId, role);
      setEditingUserId(null);
    },
    [],
  );

  const openEditUser = useCallback((user: AdminUser): void => {
    setEditUser(user);
  }, []);

  const closeEditUser = useCallback((): void => {
    setEditUser(null);
  }, []);

  // The dialog owns the field values and hands back a complete request, so the
  // table only has to forward it and close.
  const submitEditUser = useCallback(
    (
      userId: string,
      data: AdminUserUpdateRequest,
      onUpdate: (userId: string, data: AdminUserUpdateRequest) => void,
    ): void => {
      onUpdate(userId, data);
      setEditUser(null);
    },
    [],
  );

  const requestTemporaryPassword = useCallback((userId: string): void => {
    setTemporaryPasswordUserId(userId);
  }, []);
  const cancelTemporaryPassword = useCallback((): void => {
    setTemporaryPasswordUserId(null);
  }, []);
  const confirmTemporaryPassword = useCallback(
    (onTemporaryPassword: (userId: string) => void): void => {
      if (temporaryPasswordUserId === null) {
        return;
      }
      onTemporaryPassword(temporaryPasswordUserId);
      setTemporaryPasswordUserId(null);
    },
    [temporaryPasswordUserId],
  );

  return {
    editingUserId,
    setEditingUserId,
    handleRoleSelect,
    editUser,
    openEditUser,
    closeEditUser,
    submitEditUser,
    temporaryPasswordUserId,
    requestTemporaryPassword,
    cancelTemporaryPassword,
    confirmTemporaryPassword,
    ...assignPlan,
  };
}
