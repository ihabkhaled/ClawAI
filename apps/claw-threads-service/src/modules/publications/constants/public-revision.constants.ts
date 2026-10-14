import {
  type Prisma,
  PublicationSafetyStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';

/** The revision a reader sees: approved by the owner, safe, and eligible for indexing. */
export const PUBLIC_REVISION_WHERE = {
  reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
  safetyStatus: PublicationSafetyStatus.APPROVED,
  indexEligible: true,
} as const satisfies Prisma.ThreadPublicationRevisionWhereInput;
