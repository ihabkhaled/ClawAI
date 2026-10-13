import { PublicationStatus } from '../../../generated/prisma';

/** Statuses a publish may move to PUBLISHED from. */
export const REPUBLISHABLE_STATUSES: PublicationStatus[] = [
  PublicationStatus.READY_FOR_REVIEW,
  PublicationStatus.PUBLISHED,
  PublicationStatus.UNPUBLISHED,
];

/** Re-reads after losing a publish race; the second read always sees the winner's commit. */
export const PUBLISH_RACE_PASSES = 3;
