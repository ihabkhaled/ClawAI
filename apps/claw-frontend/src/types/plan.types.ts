import type { PlanLifecycleStatus } from '../enums/plan-lifecycle-status.enum';
import type { PlanModelAccessMode } from '../enums/plan-model-access-mode.enum';
import type { UserRole } from '../enums/user-role.enum';

import type { TranslateFunction } from './i18n.types';

// ─── Backend DTO mirrors (claw-auth-service plans/roles/entitlements) ─────────

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
  isDefault: boolean;
  isActive: boolean;
  isPublic: boolean;
  isTrial: boolean;
  trialDurationDays: number | null;
  lifecycleStatus: PlanLifecycleStatus;
  replacementPlanId: string | null;
  retiredAt: string | null;
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
  modelAccessMode?: PlanModelAccessMode;
  allowedCostClasses?: string[];
  modelAccess: PlanModelAccessView[];
  createdAt: string;
  updatedAt: string;
};

export type PlanRetirementResult = {
  sourcePlanId: string;
  replacementPlanId: string;
  migratedAssignments: number;
  billingPending: number;
  alreadyRetired: boolean;
};

export type PlanRetirementCandidate = {
  id: string;
  name: string;
};

export type PlanModelAccessInput = {
  provider: string;
  model: string;
  isAllowed?: boolean;
  allowAsPrimary?: boolean;
  allowAsFallback?: boolean;
  allowAsJudge?: boolean;
  allowInCompare?: boolean;
  dailyTokenLimitOverride?: number | null;
};

export type CreatePlanRequest = {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  isPublic?: boolean;
  isTrial: boolean;
  trialDurationDays: number | null;
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

export type UpdatePlanRequest = Partial<CreatePlanRequest>;

export type UpdatePlanModelAccessRequest = {
  models: PlanModelAccessInput[];
};

export type ReorderPlansRequest = {
  orderedIds: string[];
};

export type PlanUserIds = {
  userIds: string[];
};

// ─── Entitlements (self) ──────────────────────────────────────────────────────

export type EntitlementFeatureGates = {
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

export type EntitlementPlan = {
  id: string;
  slug: string;
  name: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
  featureGates: EntitlementFeatureGates;
  limits: EntitlementPlanLimits;
};

export type EntitlementPlanLimits = {
  dailyTokens: number | null;
  weeklyTokens: number | null;
  monthlyTokens: number | null;
  chatsPerDay: number | null;
};

export type EntitlementQuota = {
  dailyLimit: number;
  used: number;
  remaining: number;
  unlimited: boolean;
  adminBypass: boolean;
};

export type UserEntitlements = {
  userId: string;
  role: UserRole;
  isAdmin: boolean;
  permissions: string[];
  plan: EntitlementPlan | null;
  modelAccessMode?: PlanModelAccessMode;
  allowedModels: PlanModelAccessView[];
  allowedProviders: string[];
  quota: EntitlementQuota;
};

// ─── Plan form state ──────────────────────────────────────────────────────────

export type PlanFormState = {
  name: string;
  slug: string;
  description: string;
  displayOrder: string;
  isPublic: boolean;
  isTrial: boolean;
  dailyTokenQuota: string;
  weeklyTokenQuota: string;
  monthlyTokenQuota: string;
  maxChatsPerDay: string;
  maxMessagesPerDay: string;
  maxWorkspaceConnections: string;
  maxContextPacks: string;
  maxMemoryItems: string;
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

export type PlanFormFieldErrors = Partial<Record<keyof PlanFormState, string>>;

export type UsePlanFormResult = {
  state: PlanFormState;
  setField: <K extends keyof PlanFormState>(field: K, value: PlanFormState[K]) => void;
  fieldErrors: PlanFormFieldErrors;
  buildCreateRequest: () => CreatePlanRequest | null;
  buildUpdateRequest: () => UpdatePlanRequest | null;
};

// ─── Model-access editor row state ────────────────────────────────────────────

export type ModelAccessRowState = {
  rowKey: string;
  provider: string;
  model: string;
  isAllowed: boolean;
  allowAsPrimary: boolean;
  allowAsFallback: boolean;
  allowAsJudge: boolean;
  allowInCompare: boolean;
  dailyTokenLimitOverride: string;
};

// ─── Controller hook return shapes ────────────────────────────────────────────

export type UsePlansPageResult = {
  plans: PlanView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  pendingId: string | null;
  mutationError: Error | null;
  clearMutationError: () => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onSetDefault: (id: string) => void;
  retirementCandidate: PlanRetirementCandidate | null;
  onRequestRetirement: (plan: PlanRetirementCandidate) => void;
  onCancelRetirement: () => void;
  onConfirmRetirement: () => void;
  onRetry: () => void;
};

export type UsePlanFormPageResult = {
  isEdit: boolean;
  plan: PlanView | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSubmitting: boolean;
  submitError: Error | null;
  form: UsePlanFormResult;
  onSubmit: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

export type UseModelAccessPageResult = {
  plan: PlanView | null;
  rows: ModelAccessRowState[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSaving: boolean;
  saveError: Error | null;
  addRow: () => void;
  removeRow: (rowKey: string) => void;
  updateRow: <K extends keyof ModelAccessRowState>(
    rowKey: string,
    field: K,
    value: ModelAccessRowState[K],
  ) => void;
  onSave: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

export type UseEntitlementsResult = {
  entitlements: UserEntitlements | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
};

// ─── Component prop types ─────────────────────────────────────────────────────

export type PlanFormProps = {
  state: PlanFormState;
  fieldErrors: PlanFormFieldErrors;
  setField: <K extends keyof PlanFormState>(field: K, value: PlanFormState[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEdit: boolean;
  submitErrorMessage: string | null;
  t: TranslateFunction;
};

export type ModelAccessEditorProps = {
  rows: ModelAccessRowState[];
  addRow: () => void;
  removeRow: (rowKey: string) => void;
  updateRow: <K extends keyof ModelAccessRowState>(
    rowKey: string,
    field: K,
    value: ModelAccessRowState[K],
  ) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  saveErrorMessage: string | null;
  t: TranslateFunction;
};

export type UsageMeterProps = {
  quota: EntitlementQuota;
  t: TranslateFunction;
};

export type PlanFeatureGatesProps = {
  featureGates: EntitlementFeatureGates;
  t: TranslateFunction;
};

export type PlanLimitsProps = {
  limits: EntitlementPlanLimits;
  t: TranslateFunction;
};

export type AllowedModelsListProps = {
  models: PlanModelAccessView[];
  t: TranslateFunction;
};

export type PlanRowProps = {
  plan: PlanView;
  pendingId: string | null;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRetire: (id: string, name: string) => void;
  onEditHref: string;
  onModelAccessHref: string;
  onPricesHref: string;
  t: TranslateFunction;
};

export type PlanCardProps = {
  plan: EntitlementPlan;
  t: TranslateFunction;
};
