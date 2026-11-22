export const HISTORY_DEFAULT_LIMIT = 20;
export const HISTORY_MAX_LIMIT = 100;
/** Hard cap of cards one export reads, so a very long session cannot exhaust memory. */
export const EXPORT_MAX_EVENTS = 5000;
export const EXPORT_PAGE_SIZE = 500;
export const EXPORT_MIME_TYPES = {
  MARKDOWN: 'text/markdown; charset=utf-8',
  TXT: 'text/plain; charset=utf-8',
  PDF: 'application/pdf',
} as const;
export const EXPORT_FILE_EXTENSIONS = { MARKDOWN: 'md', TXT: 'txt', PDF: 'pdf' } as const;
/** file-generation-service stateless Markdown → PDF route (Service auth). */
export const PDF_RENDER_PATH = '/api/v1/internal/file-generations/render-pdf';
export const PDF_RENDER_TIMEOUT_MS = 30_000;
/** file-generation's render cap (EXPORT_MAX_CONTENT_CHARS there). */
export const PDF_MAX_MARKDOWN_CHARS = 200_000;
export const GAP_EVENT_ID_PREFIX = 'gap:';
export const VERSIONS_MAX_ROWS = 200;

export const SESSION_INCLUDE = {
  stream: { select: { title: true, sourceKind: true, sourceUrl: true, accessScope: true } },
} as const;
export const EVENT_CURSOR_DIGITS = /^\d{1,19}$/;
