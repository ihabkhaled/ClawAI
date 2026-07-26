/**
 * Public chat-share domain events.
 *
 * Deliberately narrow: a share event never carries message text, a title, a
 * description, or the public identifier. Those all leak the very thing the
 * feature lets an owner take back — the bus is durable and the audit trail is
 * queryable, so a revoked conversation's content must never have been written
 * there in the first place.
 *
 * `threadId` is included because audit rows are only useful if they can be tied
 * back to the conversation the owner acted on, and the bus is an internal
 * surface. The public identifier is not: it is a bearer credential for the page.
 */

/** Shared shape for every chat-share event. */
export interface ChatShareEventBase {
  /** Chat-share row id — stable across URL regeneration. */
  shareId: string;
  /** Private thread the share belongs to. Internal surface only. */
  threadId: string;
  /** Owner of the thread. */
  userId: string;
  /** ISO-8601 emission time. */
  timestamp: string;
  /** Request correlation id when the caller supplied one. */
  correlationId?: string;
}

export interface ChatSharePublishedPayload extends ChatShareEventBase {
  visibility: string;
  safetyStatus: string;
  messageCount: number;
  snapshotVersion: number;
  adsEligible: boolean;
}

export interface ChatShareUpdatedPayload extends ChatShareEventBase {
  visibility: string;
  safetyStatus: string;
  messageCount: number;
  snapshotVersion: number;
  adsEligible: boolean;
}

export interface ChatShareVisibilityChangedPayload extends ChatShareEventBase {
  previousVisibility: string;
  visibility: string;
}

export interface ChatShareRevokedPayload extends ChatShareEventBase {
  previousVisibility: string;
}

export interface ChatShareUrlRegeneratedPayload extends ChatShareEventBase {
  visibility: string;
}

export interface ChatShareSafetyRejectedPayload extends ChatShareEventBase {
  /** Machine-readable reason tags only — never the matched secret itself. */
  reasons: string[];
  safetyStatus: string;
}

export type ChatShareEventPayload =
  | ChatSharePublishedPayload
  | ChatShareUpdatedPayload
  | ChatShareVisibilityChangedPayload
  | ChatShareRevokedPayload
  | ChatShareUrlRegeneratedPayload
  | ChatShareSafetyRejectedPayload;
