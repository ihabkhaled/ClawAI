'use client';

import { useCallback } from 'react';

import type { PlanFeature } from '@/enums';
import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useAuthStore } from '@/stores/auth.store';
import type { UsePlanFeaturesReturn } from '@/types';
import { isAdmin as isAdminUser } from '@/utilities/permissions.utility';

// Controller hook for plan-feature gated UI. Reads the user's resolved plan
// from the entitlements endpoint and exposes a `has(feature)` predicate.
// ADMIN implicitly holds every gate. When no plan is attached (or the gate
// key is absent) the feature is OFF. Backend AccessControlService remains the
// authoritative enforcer — this only mirrors the gate for UI hiding and
// AccessDenied rendering.
export function usePlanFeatures(): UsePlanFeaturesReturn {
  const user = useAuthStore((state) => state.user);
  const { entitlements, isLoading } = useEntitlements();
  const isAdmin = isAdminUser(user);

  const has = useCallback(
    (feature: PlanFeature): boolean => {
      if (isAdmin) {
        return true;
      }
      const gates = entitlements?.plan?.featureGates;
      if (!gates) {
        return false;
      }
      return gates[feature] === true;
    },
    [isAdmin, entitlements],
  );

  return { has, isAdmin, isLoading };
}
