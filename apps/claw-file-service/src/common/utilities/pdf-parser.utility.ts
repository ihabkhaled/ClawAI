import { Logger } from '@nestjs/common';

const logger = new Logger('PdfParserUtility');

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  logger.debug(`extractTextFromPdf: parsing PDF — bufferSize=${String(buffer.length)}`);
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    logger.debug(
      `extractTextFromPdf: extracted ${String(result.text.length)} chars from ${String(result.total)} pages`,
    );
    return result.text;
  } finally {
    await parser.destroy();
  }
}
