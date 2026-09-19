import { HttpStatus } from '@nestjs/common';

import type { ClientHttpError } from './client-http-error.types';

/**
 * True for a 4xx error thrown by Express middleware: body-parser's 413 (body
 * too large), 400 (malformed JSON) and 415 (unsupported charset). These carry
 * `expose: true` because their message is written for the caller, so it is
 * safe to return. Anything else stays a 500. Every service's
 * GlobalExceptionFilter uses this (TD-032).
 */
export function isClientHttpError(exception: unknown): exception is ClientHttpError {
  if (!(exception instanceof Error) || !('status' in exception) || !('expose' in exception)) {
    return false;
  }
  const { status, expose } = exception;
  return (
    typeof status === 'number' &&
    status >= HttpStatus.BAD_REQUEST &&
    status < HttpStatus.INTERNAL_SERVER_ERROR &&
    expose === true
  );
}
