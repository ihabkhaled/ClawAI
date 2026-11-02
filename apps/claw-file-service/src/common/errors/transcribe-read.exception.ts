import { type HttpStatus } from '@nestjs/common';
import { type TranscribeReadErrorCode } from '../enums/transcribe-read-error-code.enum';
import { BusinessException } from './business.exception';

/** A refusal of the stateless media read, carrying its wire `code` (rule 18). */
export class TranscribeReadException extends BusinessException {
  constructor(code: TranscribeReadErrorCode, message: string, status: HttpStatus) {
    super(message, code, status);
  }
}
