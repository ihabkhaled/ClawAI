import { HttpStatus } from '@nestjs/common';

import { BusinessException } from './business.exception';

/**
 * Reading a PDF's text took longer than its wall-clock budget.
 *
 * 422, like the document-bounds refusals: the request was understood, but this
 * file cannot be read within the limits. It is the caller's file that is the
 * problem, so it is not a 5xx and a retry of the same bytes will not help.
 */
export class PdfExtractionTimeoutError extends BusinessException {
  constructor(timeoutMs: number) {
    super(
      `Reading this PDF took longer than ${String(Math.round(timeoutMs / 1000))} seconds and was stopped`,
      'PDF_EXTRACTION_TIMEOUT',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
