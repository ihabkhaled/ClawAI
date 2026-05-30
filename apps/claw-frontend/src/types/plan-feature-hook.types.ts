import type { PlanFeature } from '@/enums';

// Return shape of usePlanFeatures — feature-gate predicates derived from the
// signed-in user's plan entitlements. `has(feature)` returns true when the
// signed-in user's plan unlocks the gate (or when the user is ADMIN, who
// bypasses every gate). `isLoading` propagates the underlying entitlements
// query so callers can render a spinner during the first fetch instead of
// flickering AccessDenied.
export type UsePlanFeaturesReturn = {
  has: (feature: PlanFeature) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
};
