import { BASIS_POINTS_DENOMINATOR } from '@claw/shared-constants';

import type { EntitlementFeatureGates, PlanFormState } from '@/types/plan.types';

/** 10000 bps = 100%. The database enforces the same bound with a CHECK constraint. */
export const PAYG_CREDIT_PERCENT_BPS_MAX = BASIS_POINTS_DENOMINATOR;

/**
 * 3000 bps = 30%, the rate every seeded entry-tier plan carries.
 *
 * A default is safe here in a way a default credit AMOUNT never was: a rate
 * grants nothing on its own, and multiplied by a new plan's $0 price it stays
 * $0 until an operator publishes a price deliberately.
 */
export const PAYG_CREDIT_PERCENT_BPS_DEFAULT = '3000';

// Default state for a brand-new plan in the PlanForm. Numeric inputs are kept
// as strings (controlled inputs) and coerced by the Zod schema on submit.
// What a NEW trial plan starts with in the form. Not a limit: the owner can set any
// whole number of days in the range below, per plan (ADR-140).
export const PLAN_TRIAL_DURATION_DAYS = 30;
export const PLAN_TRIAL_MIN_DAYS = 1;
export const PLAN_TRIAL_MAX_DAYS = 3650;

export const PLAN_FORM_DEFAULTS: PlanFormState = {
  name: '',
  slug: '',
  description: '',
  displayOrder: '0',
  isPublic: true,
  isTrial: false,
  trialDurationDays: String(PLAN_TRIAL_DURATION_DAYS),
  dailyTokenQuota: '100000',
  weeklyTokenQuota: '',
  monthlyTokenQuota: '',
  // Blank, not a number: a new plan carries no fair-use ceiling on total
  // weighted spend until an operator sets one deliberately.
  monthlyProviderCostCeilingMicroUsd: '',
  paygCreditPercentBps: PAYG_CREDIT_PERCENT_BPS_DEFAULT,
  maxChatsPerDay: '',
  maxMessagesPerDay: '',
  maxWorkspaceConnections: '',
  maxContextPacks: '',
  maxMemoryItems: '',
  // The free allowance, not blank: blank means unlimited video (ADR-122).
  maxVideoSeconds: '60',
  // Mirrors the server default (2). Blank would mean unlimited.
  creditConnectorFreeRequestsPerMonth: '2',
  // A new plan has no meter and no price limit, so it never gives provider spend away by omission.
  creditConnectorFreeBudgetUsd: '',
  creditConnectorFreeMaxModelOutputUsd: '',
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
  // Paid media is opt-in on a new plan, matching the database default: a new
  // plan must never start generating images before an operator says so.
  allowImageGeneration: false,
  allowHelperVision: false,
  allowTextToSpeech: false,
};

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
  allowImageGeneration: false,
  allowHelperVision: false,
  allowTextToSpeech: false,
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
  { field: 'allowImageGeneration', labelKey: 'adminPlans.gate.allowImageGeneration' },
  { field: 'allowHelperVision', labelKey: 'adminPlans.gate.allowHelperVision' },
  { field: 'allowTextToSpeech', labelKey: 'adminPlans.gate.allowTextToSpeech' },
];

/** Upper bound on the plan editor's video length, matching the auth-service DTO (ten hours). */
export const PLAN_MAX_VIDEO_SECONDS_LIMIT = 36_000;

/** Upper bound on free credit-connector requests per month, matching the auth-service DTO. */
export const PLAN_CREDIT_FREE_REQUESTS_LIMIT = 100_000;

/** The schema reports the dollar fields under the API's micro-USD names; this maps each form field to it. */
export const PLAN_FORM_ERROR_ALIASES: Readonly<Record<string, string>> = {
  creditConnectorFreeBudgetUsd: 'creditConnectorFreeBudgetMicroUsd',
  creditConnectorFreeMaxModelOutputUsd: 'creditConnectorFreeMaxModelOutputMicroUsd',
};
