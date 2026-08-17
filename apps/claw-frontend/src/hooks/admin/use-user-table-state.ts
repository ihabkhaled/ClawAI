import { useCallback, useState } from 'react';

import type { AdminUser, AdminUserUpdateRequest, UseUserTableStateReturn } from '@/types';

export function useUserTableState(): UseUserTableStateReturn {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [profileEditingId, setProfileEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  const handleRoleSelect = useCallback(
    (userId: string, role: string, onChangeRole: (userId: string, role: string) => void): void => {
      onChangeRole(userId, role);
      setEditingUserId(null);
    },
    [],
  );

  const startProfileEdit = useCallback((user: AdminUser): void => {
    setProfileEditingId(user.id);
    setEditUsername(user.username);
  }, []);
  const finishProfileEdit = useCallback(
    (onUpdate: (userId: string, data: AdminUserUpdateRequest) => void): void => {
      if (profileEditingId === null) {
        return;
      }
      onUpdate(profileEditingId, { username: editUsername });
      setProfileEditingId(null);
    },
    [editUsername, profileEditingId],
  );

  return {
    editingUserId,
    setEditingUserId,
    handleRoleSelect,
    profileEditingId,
    editUsername,
    setEditUsername,
    startProfileEdit,
    finishProfileEdit,
  };
}
