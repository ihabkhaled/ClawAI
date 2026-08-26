export const FEEDBACK_TICKET_PREFIX = 'FDB';
export const FEEDBACK_TICKET_NUMBER_PAD = 6;
export const FEEDBACK_MAX_TITLE_LENGTH = 160;
export const FEEDBACK_MAX_SUBJECT_LENGTH = 200;
export const FEEDBACK_MAX_CONTENT_LENGTH = 20_000;
export const FEEDBACK_MAX_FILENAME_LENGTH = 200;
export const FEEDBACK_MAX_SEARCH_LENGTH = 120;

export const FEEDBACK_MAX_ATTACHMENTS = 5;
export const FEEDBACK_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;
export const FEEDBACK_ALLOWED_LINK_PROTOCOLS = ['https:', 'http:', 'mailto:'] as const;
export const FEEDBACK_DEFAULT_PAGE_SIZE = 20;
export const FEEDBACK_MAX_PAGE_SIZE = 100;

export const FEEDBACK_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'CLOSED', 'ARCHIVED'],
  CLOSED: ['OPEN', 'ARCHIVED'],
  ARCHIVED: ['OPEN'],
};
