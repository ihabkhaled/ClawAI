import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { BusinessException } from '../../../common/errors';
import {
  AUTH_RATE_LIMIT_ERROR_CODE,
  AUTH_RATE_LIMIT_ERROR_MESSAGE,
  AUTH_RATE_LIMIT_METADATA_KEY,
  AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_CODE,
  AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_MESSAGE,
  AUTH_RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SECONDS,
  RETRY_AFTER_HEADER,
} from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitUnavailableError } from '../errors/auth-rate-limit-unavailable.error';
import { AuthRateLimitService } from '../services/auth-rate-limit.service';
import type { AuthRateLimitDecision } from '../types/auth-rate-limit.types';
import { readAuthRateLimitSubject } from '../utilities/auth-rate-limit-key.utility';

/**
 * Enforces the route's `@AuthRateLimit(policy)` budget before validation and
 * before any account lookup. A refusal is a 429 with `Retry-After` and code
 * RATE_LIMITED, identical for every address. When the limiter cannot count
 * (Redis down, slow or malformed) the request is refused with a 503,
 * AUTH_RATE_LIMITER_UNAVAILABLE and `Retry-After: 30` (fail closed, ADR-230).
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<AuthRateLimitPolicy | undefined>(
      AUTH_RATE_LIMIT_METADATA_KEY,
      context.getHandler(),
    );
    if (policy === undefined) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    let decision: AuthRateLimitDecision;
    try {
      decision = await this.rateLimit.consume(policy, await readAuthRateLimitSubject(request));
    } catch (error: unknown) {
      if (!(error instanceof AuthRateLimitUnavailableError)) {
        throw error;
      }
      // Policy and reason only: never the address, the IP or the key.
      this.logger.error(`auth rate limiter unavailable, refusing policy=${policy}`);
      http
        .getResponse<Response>()
        .setHeader(RETRY_AFTER_HEADER, String(AUTH_RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SECONDS));
      throw new BusinessException(
        AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_MESSAGE,
        AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_CODE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (decision.allowed) {
      return true;
    }
    http.getResponse<Response>().setHeader(RETRY_AFTER_HEADER, String(decision.retryAfterSeconds));
    throw new BusinessException(
      AUTH_RATE_LIMIT_ERROR_MESSAGE,
      AUTH_RATE_LIMIT_ERROR_CODE,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
