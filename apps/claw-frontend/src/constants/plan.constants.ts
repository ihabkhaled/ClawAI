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
  monthlyTokenQuota: '',
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
};

export const PLAN_TRIAL_DURATION_DAYS = 30;

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
];
