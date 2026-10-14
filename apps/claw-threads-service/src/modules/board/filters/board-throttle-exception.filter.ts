import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';

import {
  BOARD_RATE_LIMIT_RETRY_AFTER_SECONDS,
  BOARD_RATE_LIMITED_MESSAGE,
} from '../constants/board.constants';
import { BoardErrorCode } from '../enums/board-error-code.enum';

/**
 * Shapes the anonymous Board's 429. The throttler's own body names an internal class
 * ('ThrottlerException'); a client gets a stable code and a plain message instead, and a Retry-After.
 * Bound to `BoardPublicController` only, so no other route in the service changes.
 */
@Catch(ThrottlerException)
export class BoardThrottleExceptionFilter implements ExceptionFilter<ThrottlerException> {
  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (!response.getHeader('Retry-After')) {
      response.setHeader('Retry-After', String(BOARD_RATE_LIMIT_RETRY_AFTER_SECONDS));
    }
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: BoardErrorCode.RATE_LIMITED,
      message: BOARD_RATE_LIMITED_MESSAGE,
    });
  }
}
