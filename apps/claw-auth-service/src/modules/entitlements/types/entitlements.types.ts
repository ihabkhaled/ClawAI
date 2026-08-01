import { type Permission } from '@claw/shared-types';
import { type PlanModelAccessMode } from '../../../generated/prisma';
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
    limits: {
      dailyTokens: number | null;
      weeklyTokens: number | null;
      monthlyTokens: number | null;
      chatsPerDay: number | null;
    };
    featureGates: PlanFeatureGates;
  } | null;
  // The explicit mode disambiguates unrestricted access from an empty
  // allow-list or deny-all policy.
  modelAccessMode: PlanModelAccessMode;
  allowedModels: PlanModelAccessView[];
  allowedProviders: string[];
  quota: {
    dailyLimit: number;
    used: number;
    remaining: number;
    // ADMIN bypasses quota entirely.
    unlimited: boolean;
    adminBypass: boolean;
  };
};
