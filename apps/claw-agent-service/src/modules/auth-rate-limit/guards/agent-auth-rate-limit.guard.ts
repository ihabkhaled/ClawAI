import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { BusinessException } from '../../../common/errors/business.exception';
import {
  AGENT_AUTH_RATE_LIMIT_ERROR_CODE,
  AGENT_AUTH_RATE_LIMIT_MESSAGE_KEY,
  AGENT_AUTH_RATE_LIMIT_METADATA_KEY,
  RETRY_AFTER_HEADER,
} from '../constants/agent-auth-rate-limit.constants';
import type { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitService } from '../services/agent-auth-rate-limit.service';
import { readPairingCode, resolveClientIp } from '../utilities/agent-auth-rate-limit-key.utility';

/**
 * Enforces the route's `@AgentAuthRateLimit(policy)` budget before
 * validation. A refusal is a 429 with `Retry-After` and code RATE_LIMITED.
 */
@Injectable()
export class AgentAuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: AgentAuthRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<AgentAuthRateLimitPolicy | undefined>(
      AGENT_AUTH_RATE_LIMIT_METADATA_KEY,
      context.getHandler(),
    );
    if (policy === undefined) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const decision = await this.rateLimit.consume(policy, {
      ip: await resolveClientIp(request.headers, request.socket.remoteAddress),
      pairingCode: readPairingCode(request.query),
    });
    if (decision.allowed) {
      return true;
    }
    http.getResponse<Response>().setHeader(RETRY_AFTER_HEADER, String(decision.retryAfterSeconds));
    throw new BusinessException(
      AGENT_AUTH_RATE_LIMIT_MESSAGE_KEY,
      AGENT_AUTH_RATE_LIMIT_ERROR_CODE,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
