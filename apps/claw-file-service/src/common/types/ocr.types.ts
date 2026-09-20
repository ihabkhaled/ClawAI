// Slice D backend 3 — OCR pipeline types.
//
// Kept in src/common/types because the OCR utility itself lives in
// src/common/utilities and the no-inline-declarations rule blocks defining
// types alongside the utility. See file-processing.manager.ts for callers.

export type OcrExtractionOptions = {
  language: string;
  timeoutMs: number;
  confidenceMin: number;
  workerThreads: number;
};

export type OcrExtractionResult = {
  text: string;
  confidence: number;
  durationMs: number;
};

// Returned by the pdf-parser utility so callers can decide whether to fall
// back to OCR. text is always the raw extracted text (may be empty); isScanned
// is set when the text length is below the configured SCANNED_PDF_CHAR_THRESHOLD
// — i.e. the PDF is most likely a scanned-page wrapper with no real text layer.
export type PdfExtractionResult = {
  text: string;
  isScanned: boolean;
  /** Pages actually parsed, in the order returned, with their own text. */
  pages: PdfPageText[];
  /** Pages in the document, whether or not they were parsed. */
  totalPages: number;
};

/** One parsed page. `number` is the 1-based page in the document, not the index. */
export type PdfPageText = {
  number: number;
  text: string;
};

/**
 * Which pages to parse.
 *
 * A range rather than a count, because a caller asking for a page range knows
 * which pages it wants; `first: 10` meaning "the first ten" and `from: 10`
 * meaning "starting at ten" are a pair of arguments nobody remembers apart.
 * Inclusive on both ends, 1-based, like every page number a person reads off
 * a document.
 */
export type PdfPageRange = {
  from: number;
  to: number;
};
