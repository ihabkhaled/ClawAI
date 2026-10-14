import { PublicationSafetyStatus, RevisionReviewStatus } from '../../../generated/prisma';
import type { OwnerListRevision, OwnerPublicationTitle } from '../types/owner-publication.types';

function isApproved(revision: OwnerListRevision): boolean {
  return (
    revision.reviewStatus === RevisionReviewStatus.OWNER_APPROVED &&
    revision.safetyStatus === PublicationSafetyStatus.APPROVED &&
    revision.indexEligible
  );
}

/**
 * The owner list shows the title the public page shows. A newer revision that failed review
 * (STALE) or has not been reviewed yet (PENDING) does not replace the approved one; its state is
 * reported in `pendingRevisionStatus` instead. A passing edit (READY_FOR_REVIEW) is what the owner
 * will publish next, so its title shows. With no approved revision the newest title shows.
 * `revisions` is newest first.
 */
export function pickOwnerListTitle(revisions: readonly OwnerListRevision[]): OwnerPublicationTitle {
  const newest = revisions[0];
  if (!newest) return { title: null, pendingRevisionStatus: null };
  const heldBack =
    newest.reviewStatus === RevisionReviewStatus.STALE ||
    newest.reviewStatus === RevisionReviewStatus.PENDING;
  const approved = heldBack ? revisions.find(isApproved) : undefined;
  return approved
    ? { title: approved.title, pendingRevisionStatus: newest.reviewStatus }
    : { title: newest.title, pendingRevisionStatus: null };
}
