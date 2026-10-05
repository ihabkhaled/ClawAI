export type PublicPublicationComment = {
  id: string;
  content: string;
  createdAt: Date;
};

export type PublicationReactionSummary = {
  likes: number;
  dislikes: number;
  viewerReaction: 'LIKE' | 'DISLIKE' | null;
};

export type PublicationChangeRequestView = {
  id: string;
  suggestion: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  ownerResponse: string | null;
  acceptedRevisionId: string | null;
  createdAt: Date;
};

export type ModerationReportView = {
  id: string;
  publicationId: string;
  commentId: string | null;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
};
