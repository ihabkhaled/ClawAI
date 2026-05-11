export type AiActionAuditEvent = {
  queueId: string;
  userId: string;
  actorUserId?: string;
  connectorId?: string | null;
  provider?: string | null;
  actionKind: string;
  riskScore: number;
  riskLabel: string;
  matchedPolicyId?: string | null;
  matchedPolicyName?: string | null;
  sourceObjectId?: string | null;
  reason?: string;
  reasonCode?: string;
  editedPayloadKeys?: string[];
  occurredAt: string;
};

export type AiActionAuditEventHandlerEntry = {
  pattern: string;
  action: string;
  defaultSeverity: string;
};

export type AiActionPolicyAuditEvent = {
  policyId: string;
  policyName: string;
  kind: string;
  priority: number;
  isActive: boolean;
  isSystemDefault: boolean;
  actorUserId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
};
