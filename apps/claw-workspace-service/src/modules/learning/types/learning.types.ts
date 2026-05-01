export type AiActionDecisionEvent = {
  queueId: string;
  userId: string;
  connectorId: string | null;
  provider: string | null;
  actionKind: string;
  riskScore?: number;
  riskLabel?: string;
  matchedPolicyId?: string | null;
  matchedPolicyName?: string | null;
  sourceObjectId?: string | null;
  occurredAt: string;
  decision: 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED' | 'EDITED';
  editDiff?: {
    before: string;
    after: string;
  } | null;
  reasonCode?: string | null;
  reasonText?: string | null;
};

export type ProposedPreference = {
  content: string;
  confidence: number;
  actionKind: string;
  evidence: string;
};

export type PreferenceUpsertResult = {
  upsertedCount: number;
  skippedCount: number;
};
