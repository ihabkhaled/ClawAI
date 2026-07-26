import type {
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
} from '@/enums/chat-share.enum';
import type { Locale } from '@/enums/locale.enum';
import type { MessageRole } from '@/enums/message-role.enum';

// Field names mirror the backend DTOs verbatim. Renaming one on the way in is
// how date rendering breaks silently: `new Date(undefined)` is "Invalid Date",
// and typecheck cannot catch it because the FE type stays internally
// consistent.

/** What the owner sees in the share dialog. */
export type OwnerChatShare = {
  publicShareId: string;
  /** Absolute URL built by the server from the canonical site origin. */
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
  /** True when the private thread has moved on since the last snapshot. */
  hasUnpublishedMessages: boolean;
};

/**
 * The public snapshot as returned to an unauthenticated visitor.
 *
 * This is the whole contract. Nothing else about the thread, the owner, or the
 * platform leaves the server — see `PublicChatShareResponse` in chat-service.
 */
export type PublicChatShare = {
  publicShareId: string;
  title: string;
  description: string | null;
  publishedAt: string;
  updatedAt: string;
  snapshotVersion: number;
  messageCount: number;
  /** Server-derived. A page never decides for itself that it may show ads. */
  adsEligible: boolean;
  indexEligible: boolean;
  contentLocale: Locale;
  visibility: ChatShareVisibility;
  messages: PublicChatShareMessage[];
};

export type PublicChatShareMessage = {
  /** The PUBLIC id. Never the private message id. */
  id: string;
  sequence: number;
  role: MessageRole;
  content: string;
  /** Display labels only — "OpenAI", "gpt-4o". Never a connector id. */
  providerLabel: string | null;
  modelLabel: string | null;
  createdAt: string;
};

/** One entry of the sitemap feed. Identifier and timestamp, nothing else. */
export type PublicChatSitemapEntry = {
  publicShareId: string;
  contentLocale: Locale;
  updatedAt: string;
};

export type PublicChatSitemapPage = {
  items: PublicChatSitemapEntry[];
  nextCursor: string | null;
};

export type PublicChatSitemapCount = {
  locale: Locale;
  count: number;
};

export type PublicChatRssEntry = {
  publicShareId: string;
  contentLocale: Locale;
  title: string;
  description: string | null;
  publishedAt: string;
  updatedAt: string;
};

/** Body of the publish request. The owner id comes from the JWT, never here. */
export type PublishChatShareInput = {
  allowIndexing: boolean;
  contentLocale: Locale;
};

export type UpdateChatShareInput = {
  allowIndexing: boolean;
};
