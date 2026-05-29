'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { usePermissions } from '@/hooks/auth/use-permissions';
import type { UseRoutePermissionGuardReturn } from '@/types';
import { requiredPermissionForPath } from '@/utilities';

// Controller hook for route-level UI gating. Resolves the permission required
// by the current pathname and checks it against the signed-in user. When no
// permission is required the route is open. Backend still enforces access.
export function useRoutePermissionGuard(): UseRoutePermissionGuardReturn {
  const pathname = usePathname();
  const { can } = usePermissions();

  return useMemo(() => {
    const requiredPermission = requiredPermissionForPath(pathname);
    const allowed = requiredPermission === null || can(requiredPermission);
    return { allowed, requiredPermission };
  }, [pathname, can]);
}
