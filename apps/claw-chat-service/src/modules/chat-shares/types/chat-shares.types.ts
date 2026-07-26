import {
  type ChatShareSafetyStatus,
  type ChatShareStatus,
  type ChatShareVisibility,
  type MessageRole,
} from '../../../generated/prisma';
import type { Locale } from '@claw/shared-types';

/**
 * The public payload. This is the whole contract with the outside world, and
 * it is an allow-list rather than an exclude-list on purpose: a field can only
 * appear here if somebody added it deliberately.
 *
 * Absent by construction: userId, the private threadId, original message ids,
 * system prompts, tool output, context receipts, memory records, routing
 * metadata, token counts, cost estimates, latency, provider response bodies,
 * moderation notes, and attachment ids or storage URLs.
 */
export type PublicChatShareResponse = {
  publicShareId: string;
  title: string;
  description: string | null;
  publishedAt: string;
  updatedAt: string;
  snapshotVersion: number;
  messageCount: number;
  // Server-derived, so a page cannot decide for itself that it may show ads.
  adsEligible: boolean;
  indexEligible: boolean;
  contentLocale: Locale;
  // Drives the page's robots metadata. PUBLIC_UNLISTED is reachable by URL but
  // must never be indexed.
  visibility: ChatShareVisibility;
  messages: PublicChatShareMessage[];
};

export type PublicChatShareMessage = {
  // The PUBLIC id. Never the private message id.
  id: string;
  sequence: number;
  role: MessageRole;
  content: string;
  // Display labels only — "OpenAI", "gpt-4o". Never a connector id.
  providerLabel: string | null;
  modelLabel: string | null;
  createdAt: string;
};

/** What the owner sees in the share dialog. */
export type OwnerChatShareView = {
  publicShareId: string;
  publicUrl: string;
  status: ChatShareStatus;
  visibility: ChatShareVisibility;
  safetyStatus: ChatShareSafetyStatus;
  snapshotVersion: number;
  title: string;
  messageCount: number;
  adsEligible: boolean;
  indexEligible: boolean;
  contentLocale: Locale;
  publishedAt: string;
  lastSnapshotAt: string;
  // True when the private thread has moved on since the last snapshot, so the
  // UI can offer "update shared version" rather than leaving the owner to
  // wonder why their newest message is missing.
  hasUnpublishedMessages: boolean;
};

/** One message as it will be copied into a snapshot. */
export type SnapshotMessage = {
  sequence: number;
  role: MessageRole;
  content: string;
  providerLabel: string | null;
  modelLabel: string | null;
  originalCreatedAt: Date;
};

/**
 * A snapshot message with its public identifier already assigned.
 *
 * The id is minted by the caller rather than positionally zipped inside the
 * repository — pairing two arrays by index is one off-by-one away from
 * attaching the wrong identifier to a message.
 */
export type PublishableSnapshotMessage = SnapshotMessage & {
  publicMessageId: string;
};

/** The outcome of scanning a snapshot before it may be indexed. */
export type SnapshotSafetyResult = {
  status: ChatShareSafetyStatus;
  // Machine-readable reasons. NEVER the matched text — writing a detected
  // secret into a response or a log is exactly the leak we are preventing.
  reasons: string[];
  meetsContentThreshold: boolean;
  indexEligible: boolean;
};
