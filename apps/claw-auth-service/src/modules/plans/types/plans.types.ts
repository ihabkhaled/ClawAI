import {
  type Plan,
  type PlanLifecycleStatus,
  type PlanModelAccess,
  type PlanModelAccessMode,
} from '../../../generated/prisma';

// Prisma Plan joined with its model-access rows — the shape repositories
// return and services map to PlanView.
export type PlanWithAccess = Plan & { modelAccess: PlanModelAccess[] };

export type PlanFeatureGates = {
  allowCompareMode: boolean;
  allowJudgeMode: boolean;
  allowResearchMode: boolean;
  allowCriticReview: boolean;
  allowWorkspaces: boolean;
  allowMemory: boolean;
  allowContextPacks: boolean;
  allowConsensusMode: boolean;
  allowEscalationChain: boolean;
  allowRepairLab: boolean;
  allowTaskDecomposer: boolean;
  allowBestOfN: boolean;
  allowVerifier: boolean;
  allowPipelineLab: boolean;
  allowCostEnsemble: boolean;
  allowRolePack: boolean;
};

export type PlanModelAccessView = {
  provider: string;
  model: string;
  isAllowed: boolean;
  allowAsPrimary: boolean;
  allowAsFallback: boolean;
  allowAsJudge: boolean;
  allowInCompare: boolean;
  dailyTokenLimitOverride: number | null;
};

export type PlanView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string | null;
  displayOrder: number;
  /** The plan a new signup is granted. */
  isDefault: boolean;
  /** The plan the public pricing page badges "Most popular". */
  isPopular: boolean;
  isActive: boolean;
  isPublic: boolean;
  isTrial: boolean;
  trialDurationDays: number | null;
  lifecycleStatus: PlanLifecycleStatus;
  replacementPlanId: string | null;
  retiredAt: Date | null;
  dailyTokenQuota: number;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  allowCompareMode: boolean;
  allowJudgeMode: boolean;
  allowResearchMode: boolean;
  allowCriticReview: boolean;
  allowWorkspaces: boolean;
  allowMemory: boolean;
  allowContextPacks: boolean;
  allowConsensusMode: boolean;
  allowEscalationChain: boolean;
  allowRepairLab: boolean;
  allowTaskDecomposer: boolean;
  allowBestOfN: boolean;
  allowVerifier: boolean;
  allowPipelineLab: boolean;
  allowCostEnsemble: boolean;
  allowRolePack: boolean;
  modelAccessMode: PlanModelAccessMode;
  allowedCostClasses: string[];
  modelAccess: PlanModelAccessView[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePlanData = {
  name: string;
  slug: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  displayOrder?: number;
  isPublic?: boolean;
  isTrial?: boolean;
  trialDurationDays?: number | null;
  dailyTokenQuota: number;
  weeklyTokenQuota?: number;
  monthlyTokenQuota?: number;
  maxChatsPerDay?: number;
  maxMessagesPerDay?: number;
  maxWorkspaceConnections?: number;
  maxContextPacks?: number;
  maxMemoryItems?: number;
  allowCompareMode?: boolean;
  allowJudgeMode?: boolean;
  allowResearchMode?: boolean;
  allowCriticReview?: boolean;
  allowWorkspaces?: boolean;
  allowMemory?: boolean;
  allowContextPacks?: boolean;
  allowConsensusMode?: boolean;
  allowEscalationChain?: boolean;
  allowRepairLab?: boolean;
  allowTaskDecomposer?: boolean;
  allowBestOfN?: boolean;
  allowVerifier?: boolean;
  allowPipelineLab?: boolean;
  allowCostEnsemble?: boolean;
  allowRolePack?: boolean;
};

export type UpdatePlanData = Partial<Omit<CreatePlanData, 'slug'>>;

export type ActiveTrialState = {
  isTrial: boolean;
  expiresAt: Date | null;
};

export type PlanRetirementResult = {
  sourcePlanId: string;
  replacementPlanId: string;
  migratedAssignments: number;
  billingPending: number;
  alreadyRetired: boolean;
};

export type PendingPlanRetirementMigration = {
  id: string;
  userId: string;
  sourcePlanId: string;
  replacementPlanId: string;
  replacementPlanSlug: string;
  sourceSubscriptionId: string;
};
