import type { PublicationSafetyFinding } from './publication-safety.types';
import type { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { PublicAuthor } from '../../author-identity/types/author-identity.types';

export type PublishedPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string };
  publishedAt: Date;
};

export type PublicPublication = {
  slug: string;
  title: string;
  contentLocale: Locale;
  publicationType: ThreadPublicationType;
  content: { markdown: string; citations: Array<{ url: string }> };
  /**
   * True when the owner accepted evidence gaps and the article states them in its limitations
   * section (ADR-194). Readers are told at the top of the page; it is never hidden.
   */
  gapsDisclosed: boolean;
  publishedAt: Date;
  /** Human views and distinct signed-in readers: counts only, never who. */
  viewCount: number;
  readerCount: number;
  /** The publisher's name; null when the account is gone or its name could not be read. */
  owner: PublicAuthor | null;
};

/** `findPublic` result: the owner is an id until `PublicationPublicReadService` names it. */
export type PublicPublicationRecord = Omit<PublicPublication, 'owner'> & { ownerId: string | null };

export type PublicPublicationDiscoveryItem = {
  slug: string;
  title: string;
  excerpt: string;
  contentLocale: Locale;
  publicationType: ThreadPublicationType;
  publishedAt: Date;
};

export type PublicPublicationSitemapItem = { slug: string; publishedAt: Date };
/** What a publish did. `newlyPublished` is false when the article was already live. */
export type PublishOutcome =
  | { kind: 'PUBLISHED'; publication: PublishedPublication; newlyPublished: boolean }
  | { kind: 'NOT_READY' }
  | { kind: 'REVOKED' };

/** Hashes that let a repeated start by the same owner find its publication again. */
export type PublicationStartIdentity = { keyHash: string; requestHash: string };

export type NewPublicationMetadata = {
  contentLocale: Locale;
  publicationType: ThreadPublicationType;
};

export type PublicationExport = {
  title: string;
  markdown: string;
  citations: Array<{ url: string }>;
};

export type PublicationEditResult = {
  revisionId: string;
  status: string;
  reviewJobId: string | null;
  reasons: string[];
  /** Flagged passages (secrets and card numbers masked), only when the safety scan blocked the edit. */
  findings?: PublicationSafetyFinding[];
};

export type PublicationRevisionReviewState = {
  revisionId: string;
  status: string;
  ready: boolean;
  reasons: string[];
};

export type EditedRevisionRecord = {
  id: string;
  revision: number;
  generationJobId: string;
  revalidationJobId: string | null;
  reviewStatus: string;
  safetyApproved: boolean;
  safetyReasons: string[];
  requestMatches: boolean;
  editInProgress: boolean;
};

export type OwnedRevisionReviewRecord = {
  contentHash: string;
  reviewStatus: string;
  safetyApproved: boolean;
  safetyReasons: string[];
  revalidationJobId: string | null;
};

/** What starting a generation answers: the new (or repeated) publication and its job. */
export type StartGenerationResult = { publicationId: string; jobId: string; status: string };

/** Records the outcome of one revision review: whether it passed and the two scores, if any. */
export type RevisionReviewSaver = (
  ready: boolean,
  judgeScore: number | null,
  criticScore: number | null,
) => Promise<void>;
