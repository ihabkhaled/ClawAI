import type { AiActionPolicyKind } from '../../../common/enums/ai-action-policy-kind.enum';
import type { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import type { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { AiActionApprovalQueue, AiActionPolicy, Prisma } from '../../../generated/prisma';

export type AiActionPolicyWriteInput = Omit<AiActionPolicy, 'id' | 'createdAt' | 'updatedAt'>;
export type AiActionPolicyMutableFields = Omit<AiActionPolicyWriteInput, 'name'>;

export type AiActionPolicySnapshot = {
  id: string;
  name: string;
  kind: AiActionPolicyKind;
  description: string | null;
  providerRegex: string;
  actionKindRegex: string;
  riskMaxLabel: AiActionRiskLabel;
  riskMaxScore: number;
  priority: number;
  requireReason: boolean;
  isActive: boolean;
  isSystemDefault: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RiskAssessment = {
  riskScore: number;
  riskLabel: AiActionRiskLabel;
  reasons: string[];
};

export type PolicyMatchResult = {
  matchedPolicy: AiActionPolicySnapshot | null;
  effectiveKind: AiActionPolicyKind | null;
  decision: 'AUTO_APPROVE' | 'PENDING_APPROVAL' | 'DENIED';
};

export type EnqueueSuggestionInput = {
  userId: string;
  connectorId: string | null;
  actionKind: string;
  provider: WorkspaceProvider | null;
  draftPayload: Record<string, unknown>;
  generatedBy?: Record<string, unknown>;
  sourceObjectId?: string | null;
};

export type EnqueueSuggestionResult = {
  queueId: string;
  status: AiActionQueueStatus;
  riskScore: number;
  riskLabel: AiActionRiskLabel;
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
};

export type ApproveQueueInput = {
  queueId: string;
  userId: string;
};

export type RejectQueueInput = {
  queueId: string;
  userId: string;
  reason: string;
};

export type EditAndApproveQueueInput = {
  queueId: string;
  userId: string;
  editedPayload: Record<string, unknown>;
};

export type BulkApproveInput = {
  userId: string;
  queueIds: string[];
};

export type BulkApproveResult = {
  approvedIds: string[];
  rejectedIds: string[];
  reasons: Record<string, string>;
};

export type QueueListFilters = {
  status?: AiActionQueueStatus;
  provider?: WorkspaceProvider;
  actionKind?: string;
  riskLabel?: AiActionRiskLabel;
  limit: number;
  cursor?: string;
};

export type CreateQueueRowInput = {
  userId: string;
  connectorId: string | null;
  actionKind: string;
  provider: WorkspaceProvider | null;
  status: AiActionQueueStatus;
  draftPayload: Prisma.InputJsonValue;
  riskLabel: AiActionApprovalQueue['riskLabel'];
  riskScore: number;
  riskReasons: Prisma.InputJsonValue;
  matchedPolicyId: string | null;
  matchedPolicyName: string | null;
  generatedBy: Prisma.InputJsonValue | undefined;
  sourceObjectId: string | null;
  expiresAt: Date | null;
};

export type ListQueueFilters = {
  userId?: string;
  status?: AiActionQueueStatus;
  provider?: WorkspaceProvider;
  actionKind?: string;
  riskLabel?: AiActionApprovalQueue['riskLabel'];
  limit: number;
  cursor?: string;
};

export type UpdateStatusExtra = {
  editedPayload?: Prisma.InputJsonValue;
  rejectionReason?: string | null;
  errorMessage?: string | null;
  workspaceActionId?: string | null;
};
