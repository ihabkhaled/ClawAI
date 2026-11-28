import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { BusinessException } from '../../../common/errors/business.exception';
import {
  AGENT_AUTH_RATE_LIMIT_ERROR_CODE,
  AGENT_AUTH_RATE_LIMIT_MESSAGE_KEY,
  AGENT_AUTH_RATE_LIMIT_METADATA_KEY,
  AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_CODE,
  AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE_KEY,
  AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SECONDS,
  RETRY_AFTER_HEADER,
} from '../constants/agent-auth-rate-limit.constants';
import type { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitUnavailableError } from '../errors/agent-auth-rate-limit-unavailable.error';
import { AgentAuthRateLimitService } from '../services/agent-auth-rate-limit.service';
import type { AgentAuthRateLimitDecision } from '../types/agent-auth-rate-limit.types';
import { readPairingCode, resolveClientIp } from '../utilities/agent-auth-rate-limit-key.utility';

/**
 * Enforces the route's `@AgentAuthRateLimit(policy)` budget before
 * validation. A refusal is a 429 with `Retry-After` and code RATE_LIMITED. When
 * the limiter cannot count it is a 503, AUTH_RATE_LIMITER_UNAVAILABLE and
 * `Retry-After: 30` (fail closed, ADR-230).
 */
@Injectable()
export class AgentAuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AgentAuthRateLimitGuard.name);

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
    let decision: AgentAuthRateLimitDecision;
    try {
      decision = await this.rateLimit.consume(policy, {
        ip: await resolveClientIp(request.headers, request.socket.remoteAddress),
        pairingCode: readPairingCode(request.query),
      });
    } catch (error: unknown) {
      if (!(error instanceof AgentAuthRateLimitUnavailableError)) {
        throw error;
      }
      // Policy and reason only: never the IP, the code or the key.
      this.logger.error(`agent auth rate limiter unavailable, refusing policy=${policy}`);
      http
        .getResponse<Response>()
        .setHeader(
          RETRY_AFTER_HEADER,
          String(AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SECONDS),
        );
      throw new BusinessException(
        AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE_KEY,
        AGENT_AUTH_RATE_LIMIT_UNAVAILABLE_ERROR_CODE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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
