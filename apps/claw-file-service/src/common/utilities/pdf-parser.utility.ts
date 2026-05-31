// Slice D backend 3 — PDF parser utility.
//
// Returns BOTH the extracted text AND an isScanned flag so callers can decide
// whether to fall back to OCR. A PDF is marked scanned when its extracted text
// is shorter than the caller-supplied threshold (typically the AppConfig
// SCANNED_PDF_CHAR_THRESHOLD). This handles the common letter-of-employment
// case where the PDF wraps a single full-page image with no real text layer.

import { Logger } from '@nestjs/common';
import { type PdfExtractionResult } from '../types/ocr.types';

const logger = new Logger('PdfParserUtility');

export async function extractTextFromPdf(
  buffer: Buffer,
  scannedThreshold = 100,
): Promise<PdfExtractionResult> {
  logger.debug(
    `extractTextFromPdf: parsing PDF — bufferSize=${String(buffer.length)} scannedThreshold=${String(scannedThreshold)}`,
  );
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text;
    const isScanned = text.length < scannedThreshold;
    logger.debug(
      `extractTextFromPdf: extracted ${String(text.length)} chars from ${String(result.total)} pages isScanned=${String(isScanned)}`,
    );
    return { text, isScanned };
  } finally {
    await parser.destroy();
  }
}
