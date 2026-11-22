import { type HttpStatus } from '@nestjs/common';
import { type TranscribeChunkErrorCode } from '../enums/transcribe-chunk-error-code.enum';
import { BusinessException } from './business.exception';

/** A refusal of the platform-paid chunk transcription, carrying its wire `code` (rule 18). */
export class TranscribeChunkException extends BusinessException {
  constructor(code: TranscribeChunkErrorCode, message: string, status: HttpStatus) {
    super(message, code, status);
  }
}
