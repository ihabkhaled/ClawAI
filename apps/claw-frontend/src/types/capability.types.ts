import type {
  CapabilityBlastRadius,
  CapabilityClass,
  CapabilityInvocationStatus,
  CapabilityOperation,
  CapabilityReversibility,
  DeviceScope,
  RiskLabel,
} from '../enums';

export type CapabilityInvocation = {
  id: string;
  userId: string;
  deviceId: string;
  recipeRunId: string | null;
  parentInvocationId: string | null;
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload: Record<string, unknown>;
  requiredScopes: DeviceScope[];
  blastRadius: CapabilityBlastRadius;
  reversibility: CapabilityReversibility;
  status: CapabilityInvocationStatus;
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  expiresAt: string;
  startedExecutingAt: string | null;
  completedAt: string | null;
  executionResult: Record<string, unknown> | null;
  executionError: string | null;
  undoPlan: { steps: UndoPlanStep[]; notes?: string } | null;
  rolledBackAt: string | null;
  rollbackResult: Record<string, unknown> | null;
  rollbackError: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type UndoPlanStep = {
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload: Record<string, unknown>;
};

export type CapabilityProposalResult = {
  id: string;
  status: CapabilityInvocationStatus;
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  expiresAt: string;
};

export type ProposeCapabilityRequest = {
  deviceId: string;
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  targetDescriptor: Record<string, unknown>;
  payload?: Record<string, unknown>;
  blastRadius: CapabilityBlastRadius;
  reversibility: CapabilityReversibility;
  requiredScopes?: DeviceScope[];
  recipeRunId?: string;
  parentInvocationId?: string;
  metadata?: Record<string, unknown>;
};

export type ListCapabilitiesQuery = {
  page?: number;
  pageSize?: number;
  status?: CapabilityInvocationStatus;
  capabilityClass?: CapabilityClass;
  recipeRunId?: string;
  deviceId?: string;
};

export type PaginatedCapabilities = {
  data: CapabilityInvocation[];
  total: number;
  page: number;
  pageSize: number;
};

export type RejectCapabilityRequest = {
  reason: string;
};

export type CancelCapabilityRequest = {
  reason?: string;
};

export type RollbackCapabilityRequest = {
  reason?: string;
};

export type UseAgentCapabilitiesPageReturn = {
  pending: CapabilityInvocation[];
  recent: CapabilityInvocation[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  handleApprove: (id: string) => void;
  handleReject: (id: string, reason: string) => void;
  handleCancel: (id: string) => void;
  isApproving: boolean;
};
