import type { FeedbackStatus, FeedbackType } from '@claw/shared-types';

import type { FeedbackSortDirection, ScreenCaptureStatus } from '@/enums';

export type FeedbackAttachment = {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isScreenshot: boolean;
};

export type FeedbackPageContext = {
  route?: string;
  url?: string;
  appVersion?: string;
  userAgent?: string;
  locale?: string;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type FeedbackHistoryEntry = {
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string;
  actorEmail: string;
  note: string | null;
  at: string;
};

export type FeedbackTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  reporterEmail: string;
  reporterName?: string;
  type: FeedbackType;
  title: string;
  subject?: string;
  contentMarkdown: string;
  status: FeedbackStatus;
  attachments: FeedbackAttachment[];
  pageContext?: FeedbackPageContext;
  history: FeedbackHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  reopenedAt?: string | null;
};

export type FeedbackListResponse = {
  items: FeedbackTicket[];
  total: number;
  page: number;
  limit: number;
};

export type CreateFeedbackRequest = {
  type: FeedbackType;
  title: string;
  subject?: string;
  contentMarkdown: string;
  attachments?: FeedbackAttachment[];
  pageContext?: FeedbackPageContext;
};

export type CreateFeedbackResponse = {
  id: string;
  ticketNumber: string;
  status: FeedbackStatus;
};

export type FeedbackListQuery = {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: FeedbackSortDirection;
};

export type FeedbackStatusCounts = Record<string, number>;

export type ScreenCaptureResult = {
  status: ScreenCaptureStatus;
  dataUrl: string | null;
};
