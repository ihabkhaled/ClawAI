import { PublicationStatus } from '../../../generated/prisma';

/** Generation job states from which the owner may start a new attempt. */
export const RETRYABLE_GENERATION_JOB_STATUSES: readonly string[] = ['FAILED', 'CANCELLED'];

/** Generation job states in which work is still being done; the owner must cancel first. */
export const ACTIVE_GENERATION_JOB_STATUSES: readonly string[] = ['QUEUED', 'RUNNING'];

export const PUBLICATION_NOT_FOUND_MESSAGE = 'Publication not found';

/** The only states in which the owner may delete a publication; PUBLISHED and REVOKED are refused. */
export const OWNER_DELETABLE_PUBLICATION_STATUSES: readonly PublicationStatus[] = [
  PublicationStatus.DRAFT,
  PublicationStatus.READY_FOR_REVIEW,
  PublicationStatus.UNPUBLISHED,
];

/** States in which Publish is offered: a reviewed draft, or an article the owner unpublished. */
export const PUBLISHABLE_PUBLICATION_STATUSES: readonly PublicationStatus[] = [
  PublicationStatus.READY_FOR_REVIEW,
  PublicationStatus.UNPUBLISHED,
];
