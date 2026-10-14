import { HttpException, HttpStatus } from '@nestjs/common';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';

const STATUS_BY_CODE = new Map<ImportErrorCode, HttpStatus>([
  [ImportErrorCode.UPLOAD_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE],
  [ImportErrorCode.SOURCE_NOT_FOUND, HttpStatus.NOT_FOUND],
  [ImportErrorCode.DRAFT_NOT_FOUND, HttpStatus.NOT_FOUND],
  [ImportErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND],
  [ImportErrorCode.SOURCE_UNREACHABLE, HttpStatus.BAD_GATEWAY],
  [ImportErrorCode.SOURCE_RATE_LIMITED, HttpStatus.SERVICE_UNAVAILABLE],
  [ImportErrorCode.DUPLICATE_PLUGIN, HttpStatus.CONFLICT],
  [ImportErrorCode.CHECKSUM_MISMATCH, HttpStatus.CONFLICT],
  [ImportErrorCode.QUOTA_PLUGINS, HttpStatus.FORBIDDEN],
  [ImportErrorCode.QUOTA_BYTES, HttpStatus.FORBIDDEN],
]);

/** A refusal with a stable code. The message is for logs; the UI localizes by `errorCode`. */
export class PluginImportError extends HttpException {
  constructor(
    readonly importCode: ImportErrorCode,
    detail: string,
  ) {
    super(
      { message: detail, errorCode: importCode },
      STATUS_BY_CODE.get(importCode) ?? HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
