import {
  ClawEffortProfile,
  type EffortBudgetEnvelope,
  type EffortOrchestration,
  EffortResearchDepth,
} from '@claw/shared-types';

/**
 * Profiles in strictly increasing order of effort. Used to walk DOWN to the
 * highest level a model actually supports, and to compare a request against
 * what was resolved.
 *
 * AUTO is excluded: it is a request to choose, not a level.
 */
export const EFFORT_PROFILE_LADDER: readonly ClawEffortProfile[] = [
  ClawEffortProfile.MINIMAL,
  ClawEffortProfile.LOW,
  ClawEffortProfile.MEDIUM,
  ClawEffortProfile.HIGH,
  ClawEffortProfile.XHIGH,
  ClawEffortProfile.MAX,
  ClawEffortProfile.ULTRA,
];

/**
 * The provider-native value each profile maps to, where the provider takes a
 * level at all.
 *
 * ULTRA is deliberately absent. It is a ClawAI orchestration preset — no
 * provider documents an `ultra` level, so sending one would be inventing a
 * parameter value. ULTRA resolves to the highest PROVEN native level plus
 * extra ClawAI passes.
 */
export const EFFORT_NATIVE_VALUE: Readonly<Partial<Record<ClawEffortProfile, string>>> = {
  [ClawEffortProfile.MINIMAL]: 'minimal',
  [ClawEffortProfile.LOW]: 'low',
  [ClawEffortProfile.MEDIUM]: 'medium',
  [ClawEffortProfile.HIGH]: 'high',
  [ClawEffortProfile.XHIGH]: 'xhigh',
  [ClawEffortProfile.MAX]: 'max',
};

/**
 * ClawAI-side orchestration per profile (§10.3). Starting profiles to evaluate
 * against real cost/quality data — not unchangeable constants. Server and
 * entitlement caps stay authoritative over all of it.
 */
export const EFFORT_ORCHESTRATION: Readonly<Record<ClawEffortProfile, EffortOrchestration>> = {
  [ClawEffortProfile.AUTO]: {
    planningPasses: 1,
    verificationPasses: 1,
    maxSubAgents: 0,
    researchDepth: EffortResearchDepth.FOCUSED,
    criticRequired: false,
    finalReceiptAudit: false,
  },
  [ClawEffortProfile.MINIMAL]: {
    planningPasses: 1,
    verificationPasses: 1,
    maxSubAgents: 0,
    researchDepth: EffortResearchDepth.NONE,
    criticRequired: false,
    finalReceiptAudit: false,
  },
  [ClawEffortProfile.LOW]: {
    planningPasses: 1,
    verificationPasses: 1,
    maxSubAgents: 0,
    researchDepth: EffortResearchDepth.FOCUSED,
    criticRequired: false,
    finalReceiptAudit: false,
  },
  [ClawEffortProfile.MEDIUM]: {
    planningPasses: 1,
    verificationPasses: 2,
    maxSubAgents: 1,
    researchDepth: EffortResearchDepth.FOCUSED,
    criticRequired: false,
    finalReceiptAudit: false,
  },
  [ClawEffortProfile.HIGH]: {
    planningPasses: 2,
    verificationPasses: 2,
    maxSubAgents: 2,
    researchDepth: EffortResearchDepth.DEEP,
    criticRequired: true,
    finalReceiptAudit: false,
  },
  [ClawEffortProfile.XHIGH]: {
    planningPasses: 2,
    verificationPasses: 3,
    maxSubAgents: 3,
    researchDepth: EffortResearchDepth.DEEP,
    criticRequired: true,
    finalReceiptAudit: true,
  },
  [ClawEffortProfile.MAX]: {
    planningPasses: 3,
    verificationPasses: 3,
    maxSubAgents: 5,
    researchDepth: EffortResearchDepth.EXHAUSTIVE,
    criticRequired: true,
    finalReceiptAudit: true,
  },
  [ClawEffortProfile.ULTRA]: {
    planningPasses: 3,
    verificationPasses: 3,
    maxSubAgents: 8,
    researchDepth: EffortResearchDepth.EXHAUSTIVE,
    criticRequired: true,
    finalReceiptAudit: true,
  },
};

/**
 * Budget envelopes per profile (§10.5). MAXIMUM envelopes, not targets, and
 * only ever applied within existing schema, entitlement, spend, runtime,
 * output and artifact limits.
 */
export const EFFORT_BUDGET: Readonly<Record<ClawEffortProfile, EffortBudgetEnvelope>> = {
  [ClawEffortProfile.AUTO]: {
    maxModelTurns: 24,
    maxToolCalls: 80,
    maxToolRounds: 40,
    maxResearchRequests: 8,
    maxResearchPages: 30,
    maxSubAgents: 1,
  },
  [ClawEffortProfile.MINIMAL]: {
    maxModelTurns: 8,
    maxToolCalls: 20,
    maxToolRounds: 12,
    maxResearchRequests: 2,
    maxResearchPages: 5,
    maxSubAgents: 0,
  },
  [ClawEffortProfile.LOW]: {
    maxModelTurns: 12,
    maxToolCalls: 40,
    maxToolRounds: 20,
    maxResearchRequests: 4,
    maxResearchPages: 10,
    maxSubAgents: 0,
  },
  [ClawEffortProfile.MEDIUM]: {
    maxModelTurns: 24,
    maxToolCalls: 80,
    maxToolRounds: 40,
    maxResearchRequests: 8,
    maxResearchPages: 30,
    maxSubAgents: 1,
  },
  [ClawEffortProfile.HIGH]: {
    maxModelTurns: 40,
    maxToolCalls: 100,
    maxToolRounds: 60,
    maxResearchRequests: 12,
    maxResearchPages: 60,
    maxSubAgents: 2,
  },
  [ClawEffortProfile.XHIGH]: {
    maxModelTurns: 60,
    maxToolCalls: 180,
    maxToolRounds: 80,
    maxResearchRequests: 20,
    maxResearchPages: 100,
    maxSubAgents: 3,
  },
  [ClawEffortProfile.MAX]: {
    maxModelTurns: 80,
    maxToolCalls: 300,
    maxToolRounds: 100,
    maxResearchRequests: 30,
    maxResearchPages: 150,
    maxSubAgents: 5,
  },
  [ClawEffortProfile.ULTRA]: {
    maxModelTurns: 100,
    maxToolCalls: 500,
    maxToolRounds: 100,
    maxResearchRequests: 50,
    maxResearchPages: 250,
    maxSubAgents: 8,
  },
};

/** Default when the caller asks for AUTO and nothing else constrains it. */
export const EFFORT_AUTO_DEFAULT = ClawEffortProfile.MEDIUM;

/** Request-body paths per resolution style. */
export const EFFORT_PATH_OPENAI_REASONING = 'reasoning.effort';
export const EFFORT_PATH_ANTHROPIC_OUTPUT = 'output_config.effort';
export const EFFORT_PATH_GEMINI_THINKING_LEVEL = 'thinking_level';
export const EFFORT_PATH_OLLAMA_THINK = 'think';
