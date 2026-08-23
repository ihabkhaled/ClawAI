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
