import type { Locale, ThreadPublicationType } from '@claw/shared-types';

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
  publishedAt: Date;
  /** Human views and distinct signed-in readers: counts only, never who. */
  viewCount: number;
  readerCount: number;
};

export type PublicPublicationDiscoveryItem = {
  slug: string;
  title: string;
  excerpt: string;
  contentLocale: Locale;
  publicationType: ThreadPublicationType;
  publishedAt: Date;
};

export type PublicPublicationSitemapItem = { slug: string; publishedAt: Date };
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
