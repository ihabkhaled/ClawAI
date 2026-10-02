import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { BusinessException } from '../../../common/errors';
import {
  AUTH_RATE_LIMIT_ERROR_CODE,
  AUTH_RATE_LIMIT_ERROR_MESSAGE,
  AUTH_RATE_LIMIT_METADATA_KEY,
  RETRY_AFTER_HEADER,
} from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitService } from '../services/auth-rate-limit.service';
import { readAuthRateLimitSubject } from '../utilities/auth-rate-limit-key.utility';

/**
 * Enforces the route's `@AuthRateLimit(policy)` budget before validation and
 * before any account lookup. A refusal is a 429 with `Retry-After` and code
 * RATE_LIMITED, identical for every address.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
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
    const decision = await this.rateLimit.consume(policy, await readAuthRateLimitSubject(request));
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
