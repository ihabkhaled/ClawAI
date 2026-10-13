import { THREAD_VIEWER_REACTION_STORAGE_PREFIX } from '@/constants/thread-publication.constants';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type { ThreadReactionSummary } from '@/types/thread-publication.types';

function storageKey(userId: string, slug: string): string {
  return `${THREAD_VIEWER_REACTION_STORAGE_PREFIX}${userId}:${slug}`;
}

/**
 * The reaction this browser last sent for a Thread. The public reactions endpoint cannot say who
 * is asking, so it always reports `viewerReaction: null`; this is the stop-gap that keeps the
 * person's own like highlighted after a reload. Storage may be blocked, so every call is guarded.
 */
export function readRememberedReaction(
  userId: string,
  slug: string,
): ThreadPublicationReaction | null {
  try {
    const stored = window.localStorage.getItem(storageKey(userId, slug));
    return Object.values(ThreadPublicationReaction).find((value) => value === stored) ?? null;
  } catch {
    return null;
  }
}

/** Remember the reaction just sent, or forget it when the person removed theirs. */
export function rememberReaction(
  userId: string,
  slug: string,
  value: ThreadPublicationReaction | null,
): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(storageKey(userId, slug));
    } else {
      window.localStorage.setItem(storageKey(userId, slug), value);
    }
  } catch {
    // Private mode or blocked storage: the highlight just will not survive a reload.
  }
}

/**
 * The summary with the viewer's own reaction filled in. A real value from the service always
 * wins; the remembered one only fills the `null` the public endpoint returns.
 */
export function withRememberedReaction(
  summary: ThreadReactionSummary | undefined,
  remembered: ThreadPublicationReaction | null,
): ThreadReactionSummary | undefined {
  if (summary === undefined || summary.viewerReaction !== null || remembered === null) {
    return summary;
  }
  return { ...summary, viewerReaction: remembered };
}
