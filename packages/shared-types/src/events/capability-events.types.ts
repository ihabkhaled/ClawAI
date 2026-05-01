/**
 * Capability framework event payloads (Stream 10).
 *
 * 12 events fired by claw-agent-service across the capability lifecycle.
 * Audit-service subscribes to all of them; memory-service may subscribe
 * later for the activity-pattern feed.
 */

export type CapabilityClassValue =
  | 'TERMINAL'
  | 'FILESYSTEM'
  | 'PROCESS'
  | 'BROWSER'
  | 'SCREEN'
  | 'CLIPBOARD'
  | 'NOTIFICATION'
  | 'APPLICATION'
  | 'AUDIO'
  | 'SYSTEM'
  | 'RECIPE_STEP';

export type CapabilityRiskLabelValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BaseCapabilityEventPayload = {
  invocationId: string;
  userId: string;
  deviceId: string;
  capabilityClass: CapabilityClassValue;
  capabilityOperation: string;
  occurredAt: string;
};

export type CapabilityProposedPayload = BaseCapabilityEventPayload & {
  riskScore: number;
  riskLabel: CapabilityRiskLabelValue;
  blastRadius: string;
  reversibility: string;
  recipeRunId?: string;
};

export type CapabilityPolicyMatchedPayload = BaseCapabilityEventPayload & {
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
  matchedPolicyKind: 'ALLOW' | 'DENY' | 'AUTO_APPROVE' | null;
  riskScore: number;
};

export type CapabilityAutoApprovedPayload = BaseCapabilityEventPayload & {
  matchedPolicyName: string;
};

export type CapabilityApprovedPayload = BaseCapabilityEventPayload & {
  approverUserId: string;
};

export type CapabilityRejectedPayload = BaseCapabilityEventPayload & {
  reviewerUserId: string;
  reason: string;
};

export type CapabilityExecutingPayload = BaseCapabilityEventPayload;

export type CapabilityExecutedPayload = BaseCapabilityEventPayload & {
  durationMs: number;
  resultSummary?: string;
};

export type CapabilityFailedPayload = BaseCapabilityEventPayload & {
  errorMessage: string;
};

export type CapabilityCancelledPayload = BaseCapabilityEventPayload & {
  cancelledByUserId?: string;
};

export type CapabilityExpiredPayload = BaseCapabilityEventPayload;

export type CapabilityRolledBackPayload = BaseCapabilityEventPayload & {
  partial: boolean;
  rollbackError?: string;
};

export type CapabilityDeniedPayload = BaseCapabilityEventPayload & {
  matchedPolicyId: string;
  matchedPolicyName: string;
  reason: string;
};

export type CapabilityEventPayload =
  | CapabilityProposedPayload
  | CapabilityPolicyMatchedPayload
  | CapabilityAutoApprovedPayload
  | CapabilityApprovedPayload
  | CapabilityRejectedPayload
  | CapabilityExecutingPayload
  | CapabilityExecutedPayload
  | CapabilityFailedPayload
  | CapabilityCancelledPayload
  | CapabilityExpiredPayload
  | CapabilityRolledBackPayload
  | CapabilityDeniedPayload;
