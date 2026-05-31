// Slice D backend 3 — OCR pipeline constants.
//
// MIME types supported by the tesseract.js OCR pipeline. Images flow directly;
// PDFs only enter the OCR fallback path when their text-layer extraction
// returns fewer than SCANNED_PDF_CHAR_THRESHOLD characters (i.e. the PDF is a
// scanned page wrapper with no real text layer).
export const OCR_SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
  'application/pdf',
] as const;

// Default tesseract language. Override per call by passing { language } into
// extractTextFromImage. 'eng' covers the bulk of files attached in chat; richer
// language packs ship with tesseract.js and can be loaded on demand.
export const DEFAULT_OCR_LANGUAGE = 'eng';
