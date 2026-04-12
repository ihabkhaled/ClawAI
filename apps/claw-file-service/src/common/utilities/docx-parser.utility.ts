import { Logger } from '@nestjs/common';
import mammoth from 'mammoth';

const logger = new Logger('DocxParserUtility');

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  logger.debug(`extractTextFromDocx: parsing DOCX — bufferSize=${String(buffer.length)}`);
  const result = await mammoth.extractRawText({ buffer });
  logger.debug(`extractTextFromDocx: extracted ${String(result.value.length)} chars`);
  return result.value;
}
