// Slice D backend 3 — PDF parser utility.
//
// Returns BOTH the extracted text AND an isScanned flag so callers can decide
// whether to fall back to OCR. A PDF is marked scanned when its extracted text
// is shorter than the caller-supplied threshold (typically the AppConfig
// SCANNED_PDF_CHAR_THRESHOLD). This handles the common letter-of-employment
// case where the PDF wraps a single full-page image with no real text layer.

import { Logger } from '@nestjs/common';
import { type PdfExtractionResult, type PdfPageRange } from '../types/ocr.types';

const logger = new Logger('PdfParserUtility');

export async function extractTextFromPdf(
  buffer: Buffer,
  scannedThreshold = 100,
  range?: PdfPageRange,
): Promise<PdfExtractionResult> {
  logger.debug(
    `extractTextFromPdf: parsing PDF — bufferSize=${String(buffer.length)} scannedThreshold=${String(scannedThreshold)} range=${range === undefined ? 'all' : `${String(range.from)}-${String(range.to)}`}`,
  );
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    // `first`/`last` mean "the first N" and "the last N" on their own and an
    // inclusive range only when BOTH are set — a pair of meanings behind one
    // pair of names. `partial` takes the page numbers outright, so the
    // requested range says what it means and an out-of-range page is simply
    // absent from the result rather than silently reinterpreted.
    const result = await (range === undefined
      ? parser.getText()
      : parser.getText({ partial: pageNumbers(range) }));
    const pages = (result.pages ?? []).map((page) => ({ number: page.num, text: page.text }));
    const text = result.text;
    const isScanned = await looksScanned(parser, text, pages, scannedThreshold);
    logger.debug(
      `extractTextFromPdf: extracted ${String(text.length)} chars from ${String(pages.length)} of ${String(result.total)} pages isScanned=${String(isScanned)}`,
    );
    return { text, isScanned, pages, totalPages: result.total };
  } finally {
    await parser.destroy();
  }
}

/**
 * A PDF is a scanned image only when it has no real text (page text, not the "-- 1 of 1 --" markers the parser adds) AND carries image
 * objects. Short text alone (a one-line letter, a receipt) is a real text PDF
 * and must keep its text instead of being routed to OCR and replaced by an
 * image placeholder. Images are looked up only when the text is short, so a
 * normal document never pays for the extra pass.
 */
async function looksScanned(
  parser: { getImage: () => Promise<{ pages: { images: unknown[] }[] }> },
  text: string,
  pages: { text: string }[],
  scannedThreshold: number,
): Promise<boolean> {
  if (text.length >= scannedThreshold || pages.some((page) => page.text.trim().length > 0))
    return false;
  const images = await parser.getImage();
  return images.pages.some((page) => page.images.length > 0);
}

/**
 * The page numbers a range names, bounded and ordered.
 *
 * A reversed range is read as the range it names rather than refused: someone
 * asking for pages 7 to 3 wants pages 3 to 7, and there is nothing else it
 * could mean. Page 0 does not exist, so the floor is 1.
 */
function pageNumbers(range: PdfPageRange): number[] {
  const from = Math.max(1, Math.min(range.from, range.to));
  const to = Math.max(range.from, range.to);
  const numbers: number[] = [];
  for (let page = from; page <= to; page += 1) numbers.push(page);
  return numbers;
}

/**
 * The first `maxPages` pages of a PDF drawn as PNG images, so a scanned
 * (image-only) PDF can go through the same OCR an uploaded picture does.
 * Pages that fail to draw are skipped rather than failing the whole file.
 */
export async function renderPdfPages(
  buffer: Buffer,
  maxPages: number,
  scale: number,
): Promise<Buffer[]> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getScreenshot({
      partial: pageNumbers({ from: 1, to: Math.max(1, maxPages) }),
      scale,
      imageBuffer: true,
      imageDataUrl: false,
    });
    const images = result.pages.flatMap((page) =>
      page.data.length > 0 ? [Buffer.from(page.data)] : [],
    );
    logger.debug(
      `renderPdfPages: rendered ${String(images.length)} of ${String(result.total)} pages (cap ${String(maxPages)})`,
    );
    return images;
  } finally {
    await parser.destroy();
  }
}
