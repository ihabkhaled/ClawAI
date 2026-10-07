import { type QuotaWindowUsage } from '../../quota/types/quota.types';
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
    isTrial: boolean;
    trialEndsAt: string | null;
    isTrialExpired: boolean;
    limits: {
      dailyTokens: number | null;
      weeklyTokens: number | null;
      monthlyTokens: number | null;
      chatsPerDay: number | null;
      messagesPerDay: number | null;
      workspaceConnections: number | null;
      contextPacks: number | null;
      memoryItems: number | null;
      // Seconds. null = unlimited, 0 = video disabled (ADR-122).
      maxVideoSeconds: number | null;
    };
    featureGates: PlanFeatureGates;
  } | null;
  // The explicit mode disambiguates unrestricted access from an empty
  // allow-list or deny-all policy.
  modelAccessMode: PlanModelAccessMode;
  // PAYG metering is on and the wallet has spendable credit (ADR-139). Lets a
  // plan-locked media feature through; the PAYG reservation still gates spend.
  hasPaygCredit: boolean;
  // The dearest model the plan's free credit-connector requests cover: its OUTPUT price in
  // micro-USD per million tokens. AUTO routing avoids anything dearer. null = no limit, and always
  // null for an administrator (ADR-162).
  freeCreditMaxModelOutputMicroUsd: number | null;
  allowedModels: PlanModelAccessView[];
  allowedProviders: string[];
  quota: {
    dailyLimit: number;
    used: number;
    remaining: number;
    // Day, week and month. Enforcement reads this; `remaining` is DAY only.
    windows: QuotaWindowUsage[];
    // ADMIN bypasses quota entirely.
    unlimited: boolean;
    adminBypass: boolean;
  };
};
