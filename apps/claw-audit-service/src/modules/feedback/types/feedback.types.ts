import { type FeedbackSource } from '../../../common/enums';

export interface FeedbackAttachment {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isScreenshot: boolean;
}

export interface FeedbackPageContext {
  route?: string;
  url?: string;
  appVersion?: string;
  userAgent?: string;
  locale?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  capturedAt?: Date;
}

export interface FeedbackHistoryEntry {
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string;
  actorEmail: string;
  note: string | null;
  at: Date;
}

export interface FeedbackListParams {
  userId?: string;
  source?: FeedbackSource;
  status?: string;
  type?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface FeedbackStatusPatch {
  set: Partial<Record<string, string | Date | null>>;
  history: FeedbackHistoryEntry;
}

export interface FileMetadataResponse {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FeedbackPaginatedTickets<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFeedbackResult {
  id: string;
  ticketNumber: string;
  status: string;
}

/** The uniform answer to a public submission: an id and nothing else. */
export interface CreatePublicFeedbackResult {
  id: string;
}

/** What the auth-service identity route returns. */
export interface UserIdentityResponse {
  firstName: string | null;
  lastName: string | null;
}

/** One hit on a rate-limit window. */
export interface RateLimitHit {
  count: number;
  limit: number;
}
