'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { usePermissions } from '@/hooks/auth/use-permissions';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import type { UseRoutePermissionGuardReturn } from '@/types';
import { requiredRequirementForPath } from '@/utilities';

// Controller hook for route-level UI gating. Resolves the requirement (a
// Permission, a PlanFeature, both, or neither) for the current pathname and
// checks each declared dimension against the signed-in user. When the route
// has no requirement (null) it is open. While entitlements are still loading
// callers should render a spinner — gating decisions that depend on plan
// features cannot be trusted until the first fetch completes. Backend still
// enforces access; this only gates the UI.
export function useRoutePermissionGuard(): UseRoutePermissionGuardReturn {
  const pathname = usePathname();
  const { can } = usePermissions();
  const { has, isLoading } = usePlanFeatures();

  return useMemo(() => {
    const required = requiredRequirementForPath(pathname);
    if (required === null) {
      return {
        allowed: true,
        requiredPermission: null,
        requiredFeature: null,
        isLoading,
      };
    }
    const permissionAllowed =
      required.permission === undefined ? true : can(required.permission);
    const featureAllowed = required.feature === undefined ? true : has(required.feature);
    return {
      allowed: permissionAllowed && featureAllowed,
      requiredPermission: required.permission ?? null,
      requiredFeature: required.feature ?? null,
      isLoading,
    };
  }, [pathname, can, has, isLoading]);
}
