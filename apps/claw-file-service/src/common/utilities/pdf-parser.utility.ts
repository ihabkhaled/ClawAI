// Slice D backend 3 — PDF parser utility.
//
// Returns BOTH the extracted text AND an isScanned flag so callers can decide
// whether to fall back to OCR. A PDF is marked scanned when its extracted text
// is shorter than the caller-supplied threshold (typically the AppConfig
// SCANNED_PDF_CHAR_THRESHOLD). This handles the common letter-of-employment
// case where the PDF wraps a single full-page image with no real text layer.

import { Logger } from '@nestjs/common';
import { type PDFParse as PdfParserInstance } from 'pdf-parse';

import {
  DOCUMENT_TEXT_MAX_CHARS,
  PDF_TEXT_MAX_PAGES,
  PDF_TEXT_TIMEOUT_MS,
} from '../../modules/files/constants/extract-text.constants';
import { PdfExtractionTimeoutError } from '../errors/pdf-extraction-timeout.error';
import { type PdfExtractionResult, type PdfPageRange, type PdfPageText } from '../types/ocr.types';
import { capDocumentText } from './document-text.utility';

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
  let timedOut = false;
  try {
    return await withDeadline(
      readPdfText(parser, scannedThreshold, range),
      PDF_TEXT_TIMEOUT_MS,
      () => {
        timedOut = true;
        // Best effort: closing the document stops pdfjs between its async steps.
        // A parse spinning synchronously is NOT interrupted by this.
        parser.destroy().catch(() => {});
      },
    );
  } finally {
    if (!timedOut) await parser.destroy();
  }
}

async function readPdfText(
  parser: PdfParserInstance,
  scannedThreshold: number,
  range: PdfPageRange | undefined,
): Promise<PdfExtractionResult> {
  // `first`/`last` mean "the first N" and "the last N" on their own and an
  // inclusive range only when BOTH are set — a pair of meanings behind one
  // pair of names. `partial` takes the page numbers outright, so the
  // requested range says what it means and an out-of-range page is simply
  // absent from the result rather than silently reinterpreted.
  //
  // The page count is read first (cheap: no page content is parsed) so a
  // document with more than PDF_TEXT_MAX_PAGES pages is cut before any of the
  // extra pages is touched. A range is clamped to the same cap.
  const totalPages = range === undefined ? (await parser.getInfo()).total : undefined;
  const cutAt = totalPages !== undefined && totalPages > PDF_TEXT_MAX_PAGES;
  const wanted = range ?? (cutAt ? { from: 1, to: PDF_TEXT_MAX_PAGES } : undefined);
  const requested =
    wanted === undefined ? undefined : pageNumbers(wanted).slice(0, PDF_TEXT_MAX_PAGES);
  const result = await (requested === undefined
    ? parser.getText()
    : parser.getText({ partial: requested }));
  const capped = capPages(
    (result.pages ?? []).map((page) => ({ number: page.num, text: page.text })),
  );
  const body = capDocumentText(result.text);
  const text =
    cutAt && totalPages !== undefined
      ? `${body}\n[Text cut: the document has ${String(totalPages)} pages, only the first ${String(PDF_TEXT_MAX_PAGES)} were read]`
      : body;
  const isScanned = await looksScanned(parser, text, capped, scannedThreshold);
  logger.debug(
    `extractTextFromPdf: extracted ${String(text.length)} chars from ${String(capped.length)} of ${String(result.total)} pages isScanned=${String(isScanned)}`,
  );
  return { text, isScanned, pages: capped, totalPages: result.total };
}

/** Keeps the per-page text inside the same total character cap as the joined text. */
function capPages(pages: PdfPageText[]): PdfPageText[] {
  const kept: PdfPageText[] = [];
  let used = 0;
  for (const page of pages) {
    if (used + page.text.length > DOCUMENT_TEXT_MAX_CHARS) {
      kept.push({ number: page.number, text: page.text.slice(0, DOCUMENT_TEXT_MAX_CHARS - used) });
      break;
    }
    used += page.text.length;
    kept.push(page);
  }
  return kept;
}

/**
 * Rejects with PdfExtractionTimeoutError when `work` outlives `timeoutMs`, and
 * always clears its timer. `onTimeout` runs once, on expiry only.
 */
async function withDeadline<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new PdfExtractionTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
    // The loser keeps running in the background; its late rejection must not
    // surface as an unhandled rejection.
    work.catch(() => {});
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
