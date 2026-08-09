import type { Permission, PlanModelAccessMode } from '@claw/shared-types';

export type PlanFeatureGates = {
  allowCompareMode: boolean;
  allowJudgeMode: boolean;
  allowResearchMode: boolean;
  // First-class sibling of allowJudgeMode. Unlocks the second-pass Critic LLM
  // in compare-mode runs. UI keeps criticEnabled gated behind judgeEnabled,
  // backend asserts BOTH allowJudgeMode + allowCriticReview when criticEnabled
  // is true so the flag works the same way every other plan feature does.
  allowCriticReview: boolean;
  allowWorkspaces: boolean;
  allowMemory: boolean;
  allowContextPacks: boolean;
};

export type AllowedModel = {
  provider: string;
  model: string;
  isAllowed: boolean;
  allowAsPrimary: boolean;
  allowAsFallback: boolean;
  allowAsJudge: boolean;
  allowInCompare: boolean;
  dailyTokenLimitOverride: number | null;
};

// Mirror of the auth-service UserEntitlements contract returned by
// GET /internal/users/:id/entitlements.
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
    featureGates: PlanFeatureGates;
  } | null;
  // Optional during rolling upgrades; explicit modes disambiguate unrestricted
  // access from an empty allow-list or deny-all policy.
  modelAccessMode?: PlanModelAccessMode;
  allowedModels: AllowedModel[];
  allowedProviders: string[];
  quota: {
    dailyLimit: number;
    used: number;
    remaining: number;
    unlimited: boolean;
    adminBypass: boolean;
  };
};

// The role a model is being used in — gates against the per-mode flags.
export enum ModelUsageType {
  PRIMARY = 'PRIMARY',
  FALLBACK = 'FALLBACK',
  JUDGE = 'JUDGE',
  COMPARE = 'COMPARE',
}

export type PlanFeature = keyof PlanFeatureGates;
