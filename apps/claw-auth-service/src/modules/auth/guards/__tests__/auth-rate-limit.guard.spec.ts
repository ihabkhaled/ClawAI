import { type ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';

import { BusinessException } from '../../../../common/errors';
import { AuthRateLimitPolicy } from '../../enums/auth-rate-limit-policy.enum';
import type { AuthRateLimitService } from '../../services/auth-rate-limit.service';
import type { AuthRateLimitDecision } from '../../types/auth-rate-limit.types';
import { AuthRateLimitGuard } from '../auth-rate-limit.guard';
import { AuthRateLimit } from '../../decorators/auth-rate-limit.decorator';

class Routes {
  @AuthRateLimit(AuthRateLimitPolicy.LOGIN)
  login(): void {}

  open(): void {}
}

function build(decision: AuthRateLimitDecision): {
  guard: AuthRateLimitGuard;
  consume: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  context: (handler: () => void) => ExecutionContext;
} {
  const consume = vi.fn().mockResolvedValue(decision);
  const setHeader = vi.fn();
  const service: Pick<AuthRateLimitService, 'consume'> = { consume };
  const guard = new AuthRateLimitGuard(new Reflector(), service as AuthRateLimitService);
  const request = {
    headers: { 'x-real-ip': '203.0.113.7' },
    socket: { remoteAddress: '127.0.0.1' },
    body: { email: ' Ada@Example.com ', password: 'secret' },
  };
  const context = (handler: () => void): ExecutionContext => {
    const http = {
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    };
    const partial: Pick<ExecutionContext, 'getHandler' | 'switchToHttp'> = {
      getHandler: () => handler,
      switchToHttp: () => http as ReturnType<ExecutionContext['switchToHttp']>,
    };
    return partial as ExecutionContext;
  };
  return { guard, consume, setHeader, context };
}

describe('AuthRateLimitGuard', () => {
  const routes = new Routes();

  it('passes a route that has no policy without touching the limiter', async () => {
    const { guard, consume, context } = build({ allowed: true });

    await expect(guard.canActivate(context(routes.open))).resolves.toBe(true);
    expect(consume).not.toHaveBeenCalled();
  });

  it('counts the real client IP and the normalized address', async () => {
    const { guard, consume, context } = build({ allowed: true });

    await expect(guard.canActivate(context(routes.login))).resolves.toBe(true);
    expect(consume).toHaveBeenCalledWith(AuthRateLimitPolicy.LOGIN, {
      ip: '203.0.113.7',
      email: 'ada@example.com',
    });
  });

  it('refuses with 429, RATE_LIMITED and a Retry-After header', async () => {
    const { guard, setHeader, context } = build({ allowed: false, retryAfterSeconds: 412 });

    const error: unknown = await guard.canActivate(context(routes.login)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BusinessException);
    const refusal = error as BusinessException;
    expect(refusal.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(refusal.code).toBe('RATE_LIMITED');
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '412');
  });

  it('never puts the address or IP in the refusal body', async () => {
    const { guard, context } = build({ allowed: false, retryAfterSeconds: 5 });

    const error = (await guard
      .canActivate(context(routes.login))
      .catch((e: unknown) => e)) as BusinessException;

    expect(JSON.stringify(error.getResponse())).not.toMatch(/ada|203\.0\.113\.7/iu);
  });
});
