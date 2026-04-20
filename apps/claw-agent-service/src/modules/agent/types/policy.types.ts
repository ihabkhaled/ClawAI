import type { PolicyKind } from '../../../common/enums/policy-kind.enum';
import type { RiskLabel } from '../../../common/enums/risk-label.enum';
import type { AccessPolicy } from '../../../generated/prisma';

export type RiskAssessment = {
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
  matchedPolicyKind: PolicyKind | null;
  blockedByPolicy: boolean;
  autoApproved: boolean;
  reasons: string[];
};

export type EvaluationAccumulator = {
  matchedPolicy: AccessPolicy | null;
  riskScore: number;
  riskLabel: RiskLabel;
  reasons: string[];
};
