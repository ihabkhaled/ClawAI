import type { PublicationEditResult } from './publication.types';

export type PublicationReactionSummary = {
  likes: number;
  dislikes: number;
  viewerReaction: 'LIKE' | 'DISLIKE' | null;
};

export type PublicationChangeRequestStatusValue = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPLIED';

export type PublicationChangeRequestView = {
  id: string;
  suggestion: string;
  status: PublicationChangeRequestStatusValue;
  ownerResponse: string | null;
  acceptedRevisionId: string | null;
  createdAt: Date;
};

/** What the database returns for the owner review list; the requester id never leaves the service. */
export type OwnerChangeRequestRecord = PublicationChangeRequestView & {
  requesterId: string | null;
};

/** One suggestion as the owner reviews it: who asked, what, and where it stands. */
export type OwnerChangeRequestView = PublicationChangeRequestView & {
  requester: { displayName: string; username: string } | null;
};

/** One of the signed-in person's own suggestions, with the Thread it is about. */
export type MyChangeRequestView = {
  id: string;
  suggestion: string;
  status: PublicationChangeRequestStatusValue;
  ownerResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
  thread: { slug: string; title: string; isPublic: boolean };
};

/** Who the viewer of a public Thread is to it. Only the owner learns anything beyond `isOwner: false`. */
export type PublicationViewerOwnership =
  { isOwner: false } | { isOwner: true; publicationId: string; pendingChangeRequests: number };

/** The person who suggested a change that the owner accepted or applied. */
export type PublicationChangeCredit = { displayName: string; username: string };

/** Everything the requester's decision notice needs, read from the saved request. */
export type ChangeDecisionContext = {
  requestId: string;
  requesterId: string | null;
  suggestion: string;
  status: PublicationChangeRequestStatusValue;
  publication: { id: string; slug: string; ownerId: string | null; title: string };
};

export type CreateChangeRequestOutcome =
  | { kind: 'CREATED'; request: PublicationChangeRequestView }
  | { kind: 'NOT_FOUND' }
  | { kind: 'OWN_THREAD' }
  | { kind: 'USER_LIMIT' }
  | { kind: 'THREAD_LIMIT' };

export type ModerationReportView = {
  id: string;
  publicationId: string;
  commentId: string | null;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
};

/**
 * The answer to an owner's decision. The first decision is `{ resolved, edit }` (HTTP 201). The
 * same decision sent again is HTTP 200 with `unchanged: true` and the STORED status and reply: the
 * first reply is kept, a different reason in the repeat is ignored, and nothing is announced twice.
 */
export type OwnerChangeRequestAnswer = {
  resolved: true;
  edit: PublicationEditResult | null;
  unchanged?: true;
  status?: string;
  ownerResponse?: string | null;
};
