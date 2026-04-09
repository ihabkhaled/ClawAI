export const FORMAT_TO_MIME_TYPE: Record<string, string> = {
  TXT: 'text/plain',
  MD: 'text/markdown',
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  CSV: 'text/csv',
  JSON: 'application/json',
  HTML: 'text/html',
};

export const FORMAT_TO_EXTENSION: Record<string, string> = {
  TXT: 'txt',
  MD: 'md',
  PDF: 'pdf',
  DOCX: 'docx',
  CSV: 'csv',
  JSON: 'json',
  HTML: 'html',
};

export const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
