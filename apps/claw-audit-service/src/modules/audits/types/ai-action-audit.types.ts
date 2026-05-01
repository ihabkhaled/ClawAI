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
