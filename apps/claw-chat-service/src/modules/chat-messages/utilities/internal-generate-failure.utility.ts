import { HttpException, HttpStatus } from '@nestjs/common';

import {
  BusinessException,
  StreamCeilingError,
  StreamIdleTimeoutError,
} from '../../../common/errors';
import {
  INTERNAL_GENERATE_CODE_CLIENT_ABORTED,
  INTERNAL_GENERATE_CODE_FAILED,
  INTERNAL_GENERATE_CODE_HARD_CEILING,
  INTERNAL_GENERATE_CODE_IDLE_TIMEOUT,
  INTERNAL_GENERATE_CODE_PATTERN,
  INTERNAL_GENERATE_CODE_PROVIDER_UNREACHABLE,
  INTERNAL_GENERATE_ERROR_MESSAGE_MAX_CHARS,
  INTERNAL_GENERATE_FAILED_MESSAGE,
  INTERNAL_GENERATE_UNREACHABLE_MESSAGE,
} from '../constants/internal-generate.constants';
import type { InternalGenerateErrorFrame } from '../types/internal-generate.types';
import type { InternalGenerateFailure } from '../types/internal-generate-stream.types';
import { sanitizeUserFacingErrorMessage } from './provider-http-failure.utility';

/**
 * Decides what a failed provider hop means for the caller and for the hold.
 *
 * Four different things used to look the same (a bare `AbortError`):
 * the provider went silent, the call ran past its ceiling, the caller went
 * away, and the provider failed. Each gets its own code, and the hold goes back
 * under the reason that is true.
 *
 * Order matters: a timeout we raised outranks "the signal is aborted", because
 * a caller that disconnects an instant after the idle clock fired still left a
 * stuck model behind, and that is what the log should say.
 */
export function classifyGenerateFailure(
  error: unknown,
  clientSignal: AbortSignal | undefined,
): InternalGenerateFailure {
  if (error instanceof StreamIdleTimeoutError) {
    return {
      releaseReason: 'TIMEOUT',
      error: new BusinessException(
        `The model sent nothing for ${String(Math.round(error.idleMs / 1000))} seconds`,
        INTERNAL_GENERATE_CODE_IDLE_TIMEOUT,
        HttpStatus.GATEWAY_TIMEOUT,
      ),
    };
  }
  if (error instanceof StreamCeilingError || isBufferedTimeout(error, clientSignal)) {
    return {
      releaseReason: 'TIMEOUT',
      error: new BusinessException(
        'The model call ran past its time ceiling',
        INTERNAL_GENERATE_CODE_HARD_CEILING,
        HttpStatus.GATEWAY_TIMEOUT,
      ),
    };
  }
  if (clientSignal?.aborted === true) {
    return {
      releaseReason: 'CANCELLED',
      error: new BusinessException(
        'The caller cancelled the model call',
        INTERNAL_GENERATE_CODE_CLIENT_ABORTED,
        HttpStatus.REQUEST_TIMEOUT,
      ),
    };
  }
  return { releaseReason: 'PROVIDER_ERROR', error };
}

/** The buffered `httpRequest` timer aborts with a bare AbortError and no reason. */
function isBufferedTimeout(error: unknown, clientSignal: AbortSignal | undefined): boolean {
  return error instanceof Error && error.name === 'AbortError' && clientSignal?.aborted !== true;
}

/**
 * Turns anything thrown into the terminal `error` line of the stream.
 *
 * The code is a machine code or a fixed fallback, never free text, and the
 * message goes through the same guard every other exit uses: a provider's JSON
 * body or a URL in it is replaced whole (ADR-124).
 */
export function toInternalGenerateErrorFrame(error: unknown): InternalGenerateErrorFrame {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    const record =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const code = typeof record['code'] === 'string' ? record['code'] : undefined;
    const message = typeof record['message'] === 'string' ? record['message'] : error.message;
    return {
      type: 'error',
      status: error.getStatus(),
      code:
        code !== undefined && INTERNAL_GENERATE_CODE_PATTERN.test(code)
          ? code
          : INTERNAL_GENERATE_CODE_FAILED,
      message: boundedMessage(message, INTERNAL_GENERATE_FAILED_MESSAGE),
    };
  }
  return {
    type: 'error',
    status: HttpStatus.BAD_GATEWAY,
    code: INTERNAL_GENERATE_CODE_PROVIDER_UNREACHABLE,
    message: INTERNAL_GENERATE_UNREACHABLE_MESSAGE,
  };
}

function boundedMessage(message: string, fallback: string): string {
  const safe = sanitizeUserFacingErrorMessage(message, fallback).trim();
  return safe.length === 0 ? fallback : safe.slice(0, INTERNAL_GENERATE_ERROR_MESSAGE_MAX_CHARS);
}
