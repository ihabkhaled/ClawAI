import { type Permission } from '@claw/shared-types';
import { type PlanFeatureGates, type PlanModelAccessView } from '../../plans/types/plans.types';

// The aggregate a downstream service needs to enforce a user's access. Returned
// by GET /internal/users/:id/entitlements and cached by the shared adapter.
export type UserEntitlements = {
  userId: string;
  role: string;
  isAdmin: boolean;
  permissions: Permission[];
  plan: {
    id: string;
    slug: string;
    name: string;
    featureGates: PlanFeatureGates;
  } | null;
  // Empty array means "no model restriction configured" (allow all) — preserves
  // the v1 hot path. A populated list restricts to exactly these entries.
  allowedModels: PlanModelAccessView[];
  allowedProviders: string[];
  quota: {
    dailyLimit: number;
    used: number;
    remaining: number;
    // ADMIN bypasses quota entirely.
    unlimited: boolean;
  };
};
