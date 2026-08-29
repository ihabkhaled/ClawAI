import type { EntitlementFeatureGates, PlanFormState } from '@/types/plan.types';

// Default state for a brand-new plan in the PlanForm. Numeric inputs are kept
// as strings (controlled inputs) and coerced by the Zod schema on submit.
export const PLAN_FORM_DEFAULTS: PlanFormState = {
  name: '',
  slug: '',
  description: '',
  displayOrder: '0',
  isPublic: true,
  isTrial: false,
  dailyTokenQuota: '100000',
  weeklyTokenQuota: '',
  monthlyTokenQuota: '',
  // Blank, not a number: a new plan inherits no connector-credit allowance
  // until an operator sets one deliberately. Guessing a default here would
  // hand out real money on every plan somebody creates in a hurry.
  monthlyProviderCostCeilingMicroUsd: '',
  maxChatsPerDay: '',
  maxMessagesPerDay: '',
  maxWorkspaceConnections: '',
  maxContextPacks: '',
  maxMemoryItems: '',
  allowCompareMode: true,
  allowJudgeMode: true,
  allowResearchMode: true,
  allowCriticReview: true,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: true,
  allowConsensusMode: true,
  allowEscalationChain: true,
  allowRepairLab: true,
  allowTaskDecomposer: true,
  allowBestOfN: true,
  allowVerifier: true,
  allowPipelineLab: true,
  allowCostEnsemble: true,
  allowRolePack: true,
};

export const PLAN_TRIAL_DURATION_DAYS = 30;

export const DISABLED_PLAN_FEATURE_GATES: EntitlementFeatureGates = {
  allowCompareMode: false,
  allowJudgeMode: false,
  allowResearchMode: false,
  allowCriticReview: false,
  allowWorkspaces: false,
  allowMemory: false,
  allowContextPacks: false,
  allowConsensusMode: false,
  allowEscalationChain: false,
  allowRepairLab: false,
  allowTaskDecomposer: false,
  allowBestOfN: false,
  allowVerifier: false,
  allowPipelineLab: false,
  allowCostEnsemble: false,
  allowRolePack: false,
};

// Feature-gate toggle field names rendered as Switches in the PlanForm and as
// badges on the user-facing plan card. Each entry carries the EntitlementFeatureGates
// key plus the i18n label key so neither the form nor the card hardcodes strings.
export const PLAN_FEATURE_GATE_FIELDS: ReadonlyArray<{
  field: keyof EntitlementFeatureGates;
  labelKey: string;
}> = [
  { field: 'allowCompareMode', labelKey: 'adminPlans.gate.allowCompareMode' },
  { field: 'allowJudgeMode', labelKey: 'adminPlans.gate.allowJudgeMode' },
  { field: 'allowResearchMode', labelKey: 'adminPlans.gate.allowResearchMode' },
  { field: 'allowCriticReview', labelKey: 'adminPlans.gate.allowCriticReview' },
  { field: 'allowWorkspaces', labelKey: 'adminPlans.gate.allowWorkspaces' },
  { field: 'allowMemory', labelKey: 'adminPlans.gate.allowMemory' },
  { field: 'allowContextPacks', labelKey: 'adminPlans.gate.allowContextPacks' },
  { field: 'allowConsensusMode', labelKey: 'adminPlans.gate.allowConsensusMode' },
  { field: 'allowEscalationChain', labelKey: 'adminPlans.gate.allowEscalationChain' },
  { field: 'allowRepairLab', labelKey: 'adminPlans.gate.allowRepairLab' },
  { field: 'allowTaskDecomposer', labelKey: 'adminPlans.gate.allowTaskDecomposer' },
  { field: 'allowBestOfN', labelKey: 'adminPlans.gate.allowBestOfN' },
  { field: 'allowVerifier', labelKey: 'adminPlans.gate.allowVerifier' },
  { field: 'allowPipelineLab', labelKey: 'adminPlans.gate.allowPipelineLab' },
  { field: 'allowCostEnsemble', labelKey: 'adminPlans.gate.allowCostEnsemble' },
  { field: 'allowRolePack', labelKey: 'adminPlans.gate.allowRolePack' },
];
