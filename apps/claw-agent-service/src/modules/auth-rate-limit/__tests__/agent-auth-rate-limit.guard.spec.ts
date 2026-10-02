import { type ExecutionContext, HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';

import { BusinessException } from '../../../common/errors/business.exception';
import { AgentAuthController } from '../../agent/controllers/agent-auth.controller';
import { SamlController } from '../../fleet/controllers/saml.controller';
import { AGENT_AUTH_RATE_LIMIT_METADATA_KEY } from '../constants/agent-auth-rate-limit.constants';
import { AgentAuthRateLimit } from '../decorators/agent-auth-rate-limit.decorator';
import { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitGuard } from '../guards/agent-auth-rate-limit.guard';
import type { AgentAuthRateLimitService } from '../services/agent-auth-rate-limit.service';
import type { AgentAuthRateLimitDecision } from '../types/agent-auth-rate-limit.types';

class Routes {
  @AgentAuthRateLimit(AgentAuthRateLimitPolicy.PAIR_POLL)
  poll(): void {}

  open(): void {}
}

function build(decision: AgentAuthRateLimitDecision): {
  guard: AgentAuthRateLimitGuard;
  consume: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  context: (handler: () => void) => ExecutionContext;
} {
  const consume = vi.fn().mockResolvedValue(decision);
  const setHeader = vi.fn();
  const service: Pick<AgentAuthRateLimitService, 'consume'> = { consume };
  const guard = new AgentAuthRateLimitGuard(new Reflector(), service as AgentAuthRateLimitService);
  const request = {
    headers: { 'x-real-ip': '203.0.113.7' },
    socket: { remoteAddress: '127.0.0.1' },
    query: { pairingCode: 'code-a' },
  };
  const context = (handler: () => void): ExecutionContext => {
    const http = { getRequest: () => request, getResponse: () => ({ setHeader }) };
    const partial: Pick<ExecutionContext, 'getHandler' | 'switchToHttp'> = {
      getHandler: () => handler,
      switchToHttp: () => http as ReturnType<ExecutionContext['switchToHttp']>,
    };
    return partial as ExecutionContext;
  };
  return { guard, consume, setHeader, context };
}

describe('AgentAuthRateLimitGuard', () => {
  const routes = new Routes();

  it('passes a route with no policy', async () => {
    const { guard, consume, context } = build({ allowed: true });

    await expect(guard.canActivate(context(routes.open))).resolves.toBe(true);
    expect(consume).not.toHaveBeenCalled();
  });

  it('counts the real client IP and the polled code', async () => {
    const { guard, consume, context } = build({ allowed: true });

    await guard.canActivate(context(routes.poll));
    expect(consume).toHaveBeenCalledWith(AgentAuthRateLimitPolicy.PAIR_POLL, {
      ip: '203.0.113.7',
      pairingCode: 'code-a',
    });
  });

  it('refuses with 429, RATE_LIMITED and Retry-After', async () => {
    const { guard, setHeader, context } = build({ allowed: false, retryAfterSeconds: 1 });

    const error = (await guard
      .canActivate(context(routes.poll))
      .catch((e: unknown) => e)) as BusinessException;

    expect(error).toBeInstanceOf(BusinessException);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.code).toBe('RATE_LIMITED');
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '1');
  });

  it('attaches the guard through the decorator', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, routes.poll)).toEqual([AgentAuthRateLimitGuard]);
  });
});

describe('routes under an agent auth budget', () => {
  const policyOf = (handler: unknown): unknown =>
    Reflect.getMetadata(AGENT_AUTH_RATE_LIMIT_METADATA_KEY, handler as object);

  it('limits the public device sign-in routes', () => {
    const proto = AgentAuthController.prototype;
    expect(policyOf(proto.pairInit)).toBe(AgentAuthRateLimitPolicy.PAIR_INIT);
    expect(policyOf(proto.pairPoll)).toBe(AgentAuthRateLimitPolicy.PAIR_POLL);
    expect(policyOf(proto.deviceCodeCreate)).toBe(AgentAuthRateLimitPolicy.DEVICE_CODE_CREATE);
    expect(policyOf(proto.refresh)).toBe(AgentAuthRateLimitPolicy.REFRESH);
    expect(policyOf(SamlController.prototype.callback)).toBe(AgentAuthRateLimitPolicy.SSO_CALLBACK);
  });

  it('leaves device-code/token to its own slow_down handling and signed-in routes alone', () => {
    const proto = AgentAuthController.prototype;
    expect(policyOf(proto.deviceCodeToken)).toBeUndefined();
    expect(policyOf(proto.pairApprove)).toBeUndefined();
    expect(policyOf(SamlController.prototype.setMetadata)).toBeUndefined();
  });
});
