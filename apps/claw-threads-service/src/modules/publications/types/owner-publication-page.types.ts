import type { PublicationGenerationState, PublicationStatus } from '../../../generated/prisma';
import type { OwnerPageStatus } from '../constants/publication-owner-page.constants';

export type OwnerPageFailure = { code: string; retryable: boolean; step: string | null };

/** One row of `GET thread-publications/mine/page`. Fields may be added, never renamed or removed. */
export type OwnerPageItem = {
  id: string;
  title: string | null;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: OwnerPageStatus;
  publishedAt: Date | null;
  failure: OwnerPageFailure | null;
  canPublish: boolean;
  canDelete: boolean;
  /** The stored publication status (DRAFT, READY_FOR_REVIEW, PUBLISHED, UNPUBLISHED, REVOKED). */
  publicationStatus: PublicationStatus;
};

export type OwnerPageResult = {
  items: OwnerPageItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** What the row stores about its job, as the status derivation reads it. */
export type OwnerPageStateRow = {
  status: PublicationStatus;
  generationState: PublicationGenerationState | null;
  generationFailureCode: string | null;
  generationFailureStep: string | null;
  generationFailureRetryable: boolean | null;
};

/** A DRAFT whose job has not been read, or is still running and was read too long ago. */
export type UnresolvedGeneration = { id: string; generationJobId: string };

/** The state to store after reading a job. */
export type GenerationStateUpdate = {
  state: PublicationGenerationState;
  failureCode: string | null;
  failureStep: string | null;
  failureRetryable: boolean | null;
};

/** What the owner list filters on. `q` is matched against the title the list shows. */
export type OwnerPageFilter = {
  ownerId: string;
  q?: string;
  status: OwnerPageStatus | 'ALL';
};
