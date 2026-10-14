import type { ThreadGenerationState } from '@/types/thread-publication.types';

/** Statuses a passed review can be published from: first publish and republish after Unpublish. */
const PUBLISHABLE_STATUSES: readonly string[] = ['READY_FOR_REVIEW', 'UNPUBLISHED'];

/**
 * Whether the owner may press Publish. The service's own flags win when it sends them; an older
 * response falls back to the status, which now includes UNPUBLISHED so a Thread can go live again.
 */
export function isThreadPublishable(state: ThreadGenerationState | undefined): boolean {
  if (state === undefined) {
    return false;
  }
  if (typeof state.canPublish === 'boolean' || typeof state.canRepublish === 'boolean') {
    return state.canPublish === true || state.canRepublish === true;
  }
  return PUBLISHABLE_STATUSES.includes(state.publicationStatus);
}
