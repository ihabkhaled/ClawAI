import type {
  ClawEffortProfile,
  EffortResearchDepth,
  EffortResolutionKind,
} from '../enums/claw-effort-profile.enum';

/**
 * ClawAI-side orchestration a profile authorises, independent of whatever the
 * provider does natively. These are envelopes, not targets — an agent should
 * not consume them just because they exist.
 */
export type EffortOrchestration = {
  planningPasses: number;
  verificationPasses: number;
  maxSubAgents: number;
  researchDepth: EffortResearchDepth;
  criticRequired: boolean;
  finalReceiptAudit: boolean;
};

/** The concrete parameter to put on the provider request, when one exists. */
export type EffortProviderParameter = {
  /** Dotted path on the request body, e.g. `reasoning.effort`, `think`. */
  path: string;
  value: string | boolean | number;
};

/**
 * Server-capped budget envelope for a profile. Applied as a MINIMUM against
 * existing schema, entitlement, spend and runtime limits — a profile can lower
 * a budget but must never raise one past its authoritative cap.
 */
export type EffortBudgetEnvelope = {
  maxModelTurns: number;
  maxToolCalls: number;
  maxToolRounds: number;
  maxResearchRequests: number;
  maxResearchPages: number;
  maxSubAgents: number;
};

export type ResolvedEffort = {
  requested: ClawEffortProfile;
  /**
   * What will actually happen. May differ from `requested` — when it does,
   * `warning` explains why, because a silently downgraded effort is
   * indistinguishable to the user from a model that just did less thinking.
   */
  resolvedProfile: ClawEffortProfile;
  providerParameter?: EffortProviderParameter;
  resolutionKind: EffortResolutionKind;
  /** True when the provider's own ceiling was hit and cannot go higher. */
  providerMaximumReached: boolean;
  orchestration: EffortOrchestration;
  budget: EffortBudgetEnvelope;
  warning?: string;
};
