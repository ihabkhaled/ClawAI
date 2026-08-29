import type { PaygWalletSnapshot } from '@claw/shared-types';

import type { PlanLifecycleStatus } from '../enums/plan-lifecycle-status.enum';
import type { PlanModelAccessMode } from '../enums/plan-model-access-mode.enum';
import type { UserRole } from '../enums/user-role.enum';

import type { UseCreditPageReturn } from './credit-hook.types';
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
  retiredAt: string | null;
  dailyTokenQuota: number;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
  /**
   * A monthly FAIR-USE ceiling on total weighted provider spend, in integer
   * micro-USD — every provider, local models included.
   *
   * This is emphatically NOT the connector-credit allowance. It briefly was, and
   * the confusion is the whole reason this comment is long: a PAYG reservation
   * passes `null` for it, and the allowance is now derived from
   * {@link PlanView.paygCreditPercentBps} and the plan's price instead.
   *
   * `null` means no ceiling; `0` means every request is over budget. They are
   * not interchangeable.
   */
  monthlyProviderCostCeilingMicroUsd: number | null;
  /**
   * The share of the plan's monthly price that becomes connector credit, in
   * basis points. 3000 is 30%; the database bounds the column to 0..10000.
   *
   * The monthly grant is `activeMonthlyPrice.amountMinor × bps / 10000`, in
   * micro-USD. Pay $20 on a 30% plan and the wallet is granted $6.00. A plan
   * priced at $0 grants $0 — intended, not a bug.
   */
  paygCreditPercentBps: number;
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
  /** Fair-use ceiling on total weighted spend, integer micro-USD. Omitted leaves it untouched. */
  monthlyProviderCostCeilingMicroUsd?: number;
  /** Basis points, 0..10000. Omitted leaves the plan's current conversion rate untouched. */
  paygCreditPercentBps?: number;
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
  messagesPerDay: number | null;
  workspaceConnections: number | null;
  contextPacks: number | null;
  memoryItems: number | null;
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
  monthlyProviderCostCeilingMicroUsd: string;
  paygCreditPercentBps: string;
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

/**
 * What a basis-point rate means in money, for the plan form.
 *
 * Two pre-formatted strings rather than raw numbers: the component renders, it
 * does not compute, and the conversion is integer arithmetic that belongs beside
 * the rest of the money maths. `null` from the producer means the plan has no
 * active monthly price yet, in which case there is nothing honest to preview.
 */
export type PlanPaygCreditPreview = {
  /** The derived monthly credit, already localized (e.g. "$6.00"). */
  credit: string;
  /** The active monthly price the credit was derived from (e.g. "$20.00"). */
  price: string;
};

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
  onSetPopular: (id: string) => void;
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
  /** `null` until the plan has an active monthly price to derive a credit from. */
  paygCreditPreview: PlanPaygCreditPreview | null;
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

/**
 * /plan owns the primary "Add credit" call to action, so its controller hook
 * carries the whole credit surface rather than a balance figure alone.
 */
export type UsePlanPageResult = UseEntitlementsResult & {
  credit: UseCreditPageReturn;
  t: TranslateFunction;
  locale: string;
};

/** /usage reads the wallet but never sells anything, so it needs no top-up flow. */
export type UseUsagePageResult = UseEntitlementsResult & {
  wallet: PaygWalletSnapshot | null;
  t: TranslateFunction;
  locale: string;
};

// ─── Component prop types ─────────────────────────────────────────────────────

export type PlanFormProps = {
  state: PlanFormState;
  fieldErrors: PlanFormFieldErrors;
  setField: <K extends keyof PlanFormState>(field: K, value: PlanFormState[K]) => void;
  /**
   * What the current rate works out to in money. `null` hides the preview
   * entirely — a guessed price would be worse than no preview at all.
   */
  paygCreditPreview: PlanPaygCreditPreview | null;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEdit: boolean;
  submitErrorMessage: string | null;
  t: TranslateFunction;
};

export type ModelAccessEditorProps = {
  rows: ModelAccessRowState[];
  /**
   * Deployments an administrator has exposed, and therefore the only ones a
   * plan may be given. Optional so the editor still renders while the list is
   * loading; an empty list simply offers nothing to select, which is correct
   * when no model has been exposed yet.
   */
  exposedModels?: Array<{ provider: string; modelKey: string; displayName: string }>;
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
  /**
   * The pay-as-you-go wallet, rendered as a first-class sibling of the token
   * bar. Optional so read-only call sites (and existing tests) keep working —
   * omitted, the meter is exactly the token-only meter it always was.
   */
  wallet?: PaygWalletSnapshot | null;
  t: TranslateFunction;
  /** Needed only when `wallet` is supplied; money and dates are localized. */
  locale?: string;
};

export type PlanFeatureGatesProps = {
  featureGates?: EntitlementFeatureGates;
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
  onSetPopular: (id: string) => void;
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
