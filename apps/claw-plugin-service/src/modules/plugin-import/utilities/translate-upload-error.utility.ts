import { PayloadTooLargeException } from '@nestjs/common';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { PluginImportError } from '../errors/plugin-import.error';

/** multer's bare 413 becomes a refusal with the stable `errorCode` the UI localizes; anything else is untouched. */
export function translateUploadError(error: unknown): unknown {
  return error instanceof PayloadTooLargeException
    ? new PluginImportError(ImportErrorCode.FILE_TOO_LARGE, 'the upload is too large')
    : error;
}
