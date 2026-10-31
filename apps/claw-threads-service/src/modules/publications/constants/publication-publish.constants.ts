import {
  type Prisma,
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';

/** Statuses a publish may move to PUBLISHED from. */
export const REPUBLISHABLE_STATUSES: PublicationStatus[] = [
  PublicationStatus.READY_FOR_REVIEW,
  PublicationStatus.PUBLISHED,
  PublicationStatus.UNPUBLISHED,
];

/** Re-reads after losing a publish race; the second read always sees the winner's commit. */
export const PUBLISH_RACE_PASSES = 3;

/**
 * The revisions Publish may use: reviewed (or already approved), safe and index-eligible. The one
 * definition both the publish write and the owner list's `canPublish` read, so they cannot drift.
 */
export const PUBLISHABLE_REVISION_WHERE: Prisma.ThreadPublicationRevisionWhereInput = {
  reviewStatus: {
    in: [RevisionReviewStatus.READY_FOR_REVIEW, RevisionReviewStatus.OWNER_APPROVED],
  },
  safetyStatus: PublicationSafetyStatus.APPROVED,
  indexEligible: true,
};
