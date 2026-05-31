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
};
