import {
  type ChatSharePublishedPayload,
  type ChatShareRevokedPayload,
  type ChatShareSafetyRejectedPayload,
  type ChatShareUpdatedPayload,
  type ChatShareUrlRegeneratedPayload,
  type ChatShareVisibilityChangedPayload,
} from '@claw/shared-types';

/** Union of every chat-share payload this consumer accepts. */
export type ChatShareAuditPayload =
  | ChatSharePublishedPayload
  | ChatShareUpdatedPayload
  | ChatShareVisibilityChangedPayload
  | ChatShareRevokedPayload
  | ChatShareUrlRegeneratedPayload
  | ChatShareSafetyRejectedPayload;

/** Normalised shape written to the audit collection. */
export type ChatShareAuditRow = {
  userId: string;
  action: string;
  entityId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: Record<string, unknown>;
};
