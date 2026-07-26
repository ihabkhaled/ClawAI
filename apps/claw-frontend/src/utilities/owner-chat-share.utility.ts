import { ChatShareStatus } from '@/enums/chat-share.enum';
import type { OwnerChatShare } from '@/types/chat-share.types';

/**
 * Narrows an untrusted API payload to a real share, or null.
 *
 * Exists because "no share" does not arrive as `null`. A NestJS controller
 * returning `null` sends an **empty body**, axios parses an empty body as `''`,
 * and `'' ?? null` is `''` — truthy enough to survive a `=== null` check and
 * falsy enough to render every field as a default. The share dialog consequently
 * showed a published share, version 0, zero messages and an empty public link for
 * threads that had never been shared.
 *
 * The guard keys on `publicShareId` rather than on the shape as a whole: it is the
 * one field that cannot be absent from a genuine share, and checking a single
 * required field means a future added field cannot accidentally make valid
 * payloads fail this check.
 *
 * A REVOKED share is also "no share". The row outlives revocation so a later
 * re-publish can reuse it, but presenting it to the owner claims a private
 * conversation is public — the worst direction for this particular lie to run.
 * The backend now filters these out too; this is the second lock on that door,
 * and it is the one that holds against an older backend.
 */
export function asOwnerChatShare(payload: unknown): OwnerChatShare | null {
  if (payload === null || payload === undefined || typeof payload !== 'object') {
    return null;
  }
  const candidate = payload as Partial<OwnerChatShare>;
  const publicShareId = candidate.publicShareId;
  if (typeof publicShareId !== 'string' || publicShareId.length === 0) {
    return null;
  }
  if (candidate.status !== ChatShareStatus.ACTIVE) {
    return null;
  }
  return candidate as OwnerChatShare;
}
