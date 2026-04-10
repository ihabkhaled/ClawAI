import { useCallback, useState } from 'react';

import type { UseUserTableStateReturn } from '@/types';

export function useUserTableState(): UseUserTableStateReturn {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleRoleSelect = useCallback(
    (userId: string, role: string, onChangeRole: (userId: string, role: string) => void): void => {
      onChangeRole(userId, role);
      setEditingUserId(null);
    },
    [],
  );

  return { editingUserId, setEditingUserId, handleRoleSelect };
}
