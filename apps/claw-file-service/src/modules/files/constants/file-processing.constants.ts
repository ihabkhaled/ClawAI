export const MIME_TYPE_PDF = 'application/pdf';
export const MIME_TYPE_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MIME_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_TYPE_PPTX =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Browsers disagree on which of these they send for a .rtf file, so both are
// treated as RTF rather than trusting one and decoding the other as plain text.
export const RTF_MIME_TYPES = ['application/rtf', 'text/rtf'] as const;

// Formats whose raw bytes mean nothing to a language model, so a row carrying
// no extracted text for one of these has not really been processed regardless
// of what its status column says.
export const EXTRACTION_REQUIRED_MIME_TYPES = new Set<string>([
  MIME_TYPE_PDF,
  MIME_TYPE_DOCX,
  MIME_TYPE_XLSX,
  MIME_TYPE_PPTX,
  ...RTF_MIME_TYPES,
]);

// A row left PROCESSING for longer than this lost its worker — the container
// restarted mid-extraction, or the process died. Nothing else would ever move
// it, and a permanently unfinished row keeps the file-list poller alive.
// Comfortably above OCR_TIMEOUT_MS (30s default) so a slow-but-live extraction
// is never reaped out from under itself.
export const STALE_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
