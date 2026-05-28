import { useCallback } from 'react';

import type { Permission } from '@/enums';
import { useAuthStore } from '@/stores/auth.store';
import { hasAnyPermission, hasPermission, isAdmin } from '@/utilities/permissions.utility';

// Controller hook for permission-gated UI. Reads the current user from the
// auth store and exposes ergonomic checks. Backend still enforces everything.
export function usePermissions(): {
  isAdmin: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
} {
  const user = useAuthStore((state) => state.user);

  const can = useCallback((permission: Permission) => hasPermission(user, permission), [user]);
  const canAny = useCallback(
    (permissions: Permission[]) => hasAnyPermission(user, permissions),
    [user],
  );

  return { isAdmin: isAdmin(user), can, canAny };
}
