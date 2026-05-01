import type { CapabilityInvocation } from '../../../generated/prisma';
import type { DeviceScope } from '../../../common/enums/device-scope.enum';
import type { CapabilityClass } from '../../../common/enums/capability-class.enum';
import type { CapabilityOperation } from '../../../common/enums/capability-operation.enum';
import type { CapabilityBlastRadius } from '../../../common/enums/capability-blast-radius.enum';
import type { CapabilityReversibility } from '../../../common/enums/capability-reversibility.enum';
import type { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import type { RiskLabel } from '../../../common/enums/risk-label.enum';

/**
 * Capability descriptor — the typed proposal shape from CLI to backend.
 * Every new capability MUST carry these fields; the framework refuses to
 * register a proposal that omits them.
 */
export type CapabilityDescriptor = {
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload: Record<string, unknown>;
  blastRadius: CapabilityBlastRadius;
  reversibility: CapabilityReversibility;
  requiredScopes: DeviceScope[];
};

export type CapabilityProposalInput = CapabilityDescriptor & {
  userId: string;
  deviceId: string;
  recipeRunId?: string;
  parentInvocationId?: string;
  metadata?: Record<string, unknown>;
};

export type CapabilityProposalResult = {
  id: string;
  status: CapabilityInvocationStatus;
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  expiresAt: Date;
};

export type RiskAssessmentInput = {
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload: Record<string, unknown>;
  blastRadius: CapabilityBlastRadius;
  reversibility: CapabilityReversibility;
  userId: string;
  deviceId: string;
  // Optional context computed by caller
  deviceAgeDays?: number;
  userInvocationsThisClassCount?: number;
};

export type RiskAssessmentResult = {
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
  status: CapabilityInvocationStatus;
  reasons: string[];
};

/**
 * UndoPlan — typed structure recorded by the CLI when executing a
 * COMPENSATABLE capability so the backend can replay the inverse on
 * rollback.  Each step is itself a CapabilityDescriptor that the CLI
 * is permitted to execute without a fresh approval (rollback context).
 */
export type UndoPlanStep = {
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload: Record<string, unknown>;
};

export type UndoPlan = {
  steps: UndoPlanStep[];
  notes?: string;
};

/**
 * Lineage — chain returned by GET /agent/capabilities/:id/lineage.
 */
export type CapabilityLineageStep = {
  kind: 'RECIPE' | 'CAPABILITY' | 'POLICY' | 'EXECUTION' | 'AUDIT' | 'ROLLBACK';
  occurredAt: Date;
  summary: string;
  refId?: string;
  payload?: Record<string, unknown>;
};

export type CapabilityLineage = {
  invocationId: string;
  steps: CapabilityLineageStep[];
};

export type PaginatedCapabilities = {
  data: CapabilityInvocation[];
  total: number;
  page: number;
  pageSize: number;
};
