import type {
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';

/** The revision fields the owner list needs to choose a title. */
export type OwnerListRevision = {
  title: string;
  reviewStatus: RevisionReviewStatus;
  safetyStatus: PublicationSafetyStatus;
  indexEligible: boolean;
};

export type OwnerPublicationTitle = {
  title: string | null;
  /** Review state of a newer revision that is not the one shown (STALE or PENDING); else null. */
  pendingRevisionStatus: RevisionReviewStatus | null;
};

export type OwnedPublicationListItem = OwnerPublicationTitle & {
  id: string;
  status: PublicationStatus;
  slug: string;
  updatedAt: Date;
  /** Reader suggestions waiting for the owner's answer. */
  pendingChangeRequests: number;
};

/** The newest revision the owner could publish, as the generation-state answer needs it. */
export type LatestRevisionDraft = {
  markdown: string;
  citations: Array<{ evidenceId: string; url: string }>;
  contentHash: string;
  judgeScore: number | null;
  criticScore: number | null;
  /** True when the article was written with owner-accepted evidence gaps (ADR-194). */
  gapsDisclosed?: boolean;
};
