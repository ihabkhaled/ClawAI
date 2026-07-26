import {
  MIN_INDEXABLE_CONTENT_CHARS,
  MIN_INDEXABLE_MESSAGE_COUNT,
} from '../constants/chat-shares.constants';
import { PII_PATTERNS, SECRET_PATTERNS } from '../constants/secret-patterns.constants';
import { SnapshotSafetyReason } from '../enums/snapshot-safety-reason.enum';
import { type SnapshotMessage, type SnapshotSafetyResult } from '../types/chat-shares.types';
import { ChatShareSafetyStatus } from '../../../generated/prisma';

/**
 * Decides whether a snapshot may be handed to a search engine.
 *
 * The realistic failure this guards against is not an attacker: it is a user
 * who pasted an API key into a chat six weeks ago, forgot, and is now sharing
 * the thread. So a hit downgrades the share to REQUIRES_REVIEW instead of
 * publishing it — the owner can still share it unlisted, but it does not go
 * into a search index while an apparent credential sits in it.
 *
 * Reasons are machine codes. The matched text is NEVER returned or logged;
 * echoing a detected secret into an error payload or a log line is precisely
 * the leak being prevented.
 */
export function evaluateSnapshotSafety(messages: SnapshotMessage[]): SnapshotSafetyResult {
  const reasons: string[] = [];
  const combined = messages.map((message) => message.content).join('\n');

  if (SECRET_PATTERNS.some((pattern) => pattern.test(combined))) {
    reasons.push(SnapshotSafetyReason.POSSIBLE_SECRET);
  }
  if (PII_PATTERNS.some((pattern) => pattern.test(combined))) {
    reasons.push(SnapshotSafetyReason.POSSIBLE_PII);
  }

  const meetsContentThreshold =
    messages.length >= MIN_INDEXABLE_MESSAGE_COUNT &&
    combined.length >= MIN_INDEXABLE_CONTENT_CHARS;

  if (!meetsContentThreshold) {
    reasons.push(SnapshotSafetyReason.INSUFFICIENT_CONTENT);
  }

  return { status: resolveStatus(reasons), reasons, meetsContentThreshold };
}

/**
 * A suspected secret or PII needs a human decision, so the share sits at
 * REQUIRES_REVIEW. Thin content is not a safety problem at all — it just is not
 * worth indexing — so it stays PENDING and simply never becomes ad- or
 * index-eligible.
 */
function resolveStatus(reasons: string[]): ChatShareSafetyStatus {
  const needsReview =
    reasons.includes(SnapshotSafetyReason.POSSIBLE_SECRET) ||
    reasons.includes(SnapshotSafetyReason.POSSIBLE_PII);
  if (needsReview) {
    return ChatShareSafetyStatus.REQUIRES_REVIEW;
  }
  return reasons.length === 0 ? ChatShareSafetyStatus.APPROVED : ChatShareSafetyStatus.PENDING;
}

/**
 * Whether a share may carry advertising.
 *
 * Fails closed: every condition must hold. A URL matching /share/chat/* is
 * never enough on its own — that is the difference between "this page is
 * allowed to show ads" and "this page has the right shape".
 */
export function resolveAdsEligibility(
  safetyStatus: ChatShareSafetyStatus,
  meetsContentThreshold: boolean,
): boolean {
  return safetyStatus === ChatShareSafetyStatus.APPROVED && meetsContentThreshold;
}
