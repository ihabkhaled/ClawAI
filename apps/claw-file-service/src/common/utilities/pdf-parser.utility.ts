import { Logger } from '@nestjs/common';
import type { PdfParseFn } from '../../modules/files/types/pdf-parser.types';

const logger = new Logger('PdfParserUtility');

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  logger.debug(`extractTextFromPdf: parsing PDF — bufferSize=${String(buffer.length)}`);
  const mod = await import('pdf-parse');
  const pdfParse = (mod.default ?? mod) as unknown as PdfParseFn;
  const result = await pdfParse(buffer);
  logger.debug(
    `extractTextFromPdf: extracted ${String(result.text.length)} chars from ${String(result.numpages)} pages`,
  );
  return result.text;
}
