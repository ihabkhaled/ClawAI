export type PublishedPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string };
  publishedAt: Date;
};

export type PublicPublication = {
  id: string;
  slug: string;
  title: string;
  content: { markdown: string; citations: Array<{ url: string }> };
  publishedAt: Date;
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
