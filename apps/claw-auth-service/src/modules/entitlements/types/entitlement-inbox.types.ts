import { type Prisma } from '../../../generated/prisma';

export type ClaimInboxEventData = {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  producer: string;
  userId: string;
  payloadJson: Prisma.InputJsonValue;
  effectiveAt: Date;
};

// Why an event did or did not change entitlement. Every rejection reason is
// distinct so the reconciliation dashboard can tell a duplicate (harmless) from
// an untrusted producer (a security event worth alerting on).
export type InboxApplyOutcome =
  | 'APPLIED'
  | 'DUPLICATE'
  | 'SKIPPED_STALE'
  | 'REJECTED_SCHEMA'
  | 'REJECTED_PRODUCER'
  | 'REJECTED_VERSION'
  | 'FAILED';

export type ApplyEntitlementInput = {
  pattern: string;
  userId: string;
  planId: string | null;
  subscriptionId: string | null;
  effectiveAtMs: number;
  entitlementValidUntilMs: number;
  sourceEventId: string;
};
