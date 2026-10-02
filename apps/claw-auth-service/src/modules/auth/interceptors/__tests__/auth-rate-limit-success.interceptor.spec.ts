import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthRateLimit } from '../../decorators/auth-rate-limit.decorator';
import { AuthRateLimitPolicy } from '../../enums/auth-rate-limit-policy.enum';
import type { AuthRateLimitService } from '../../services/auth-rate-limit.service';
import { AuthRateLimitSuccessInterceptor } from '../auth-rate-limit-success.interceptor';

class Routes {
  @AuthRateLimit(AuthRateLimitPolicy.LOGIN)
  login(): void {}

  @AuthRateLimit(AuthRateLimitPolicy.REGISTER)
  register(): void {}

  open(): void {}
}

const routes = new Routes();

function build(): {
  interceptor: AuthRateLimitSuccessInterceptor;
  settle: ReturnType<typeof vi.fn>;
  context: (handler: () => void) => ExecutionContext;
} {
  const settle = vi.fn().mockResolvedValue(undefined);
  const service: Pick<AuthRateLimitService, 'settle' | 'refundsOnSuccess'> = {
    settle,
    refundsOnSuccess: (policy) => policy === AuthRateLimitPolicy.LOGIN,
  };
  const interceptor = new AuthRateLimitSuccessInterceptor(
    new Reflector(),
    service as AuthRateLimitService,
  );
  const request = {
    headers: { 'x-real-ip': '203.0.113.7' },
    socket: { remoteAddress: '127.0.0.1' },
    body: { email: ' Ada@Example.com ', password: 'secret' },
  };
  const context = (handler: () => void): ExecutionContext => {
    const partial: Pick<ExecutionContext, 'getHandler' | 'switchToHttp'> = {
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: <T>() => request as T,
        getResponse: <T>() => ({}) as T,
        getNext: <T>() => ({}) as T,
      }),
    };
    return partial as ExecutionContext;
  };
  return { interceptor, settle, context };
}

function callHandler(result: CallHandler['handle']): CallHandler {
  return { handle: result };
}

describe('AuthRateLimitSuccessInterceptor', () => {
  it('settles the login budget after a success and passes the result through', async () => {
    const { interceptor, settle, context } = build();
    const result = { tokens: 't' };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context(routes.login),
          callHandler(() => of(result)),
        ),
      ),
    ).resolves.toBe(result);
    expect(settle).toHaveBeenCalledWith(AuthRateLimitPolicy.LOGIN, {
      ip: '203.0.113.7',
      email: 'ada@example.com',
    });
  });

  it('does not settle when the login failed (a wrong password stays counted)', async () => {
    const { interceptor, settle, context } = build();
    const failure = new Error('invalid credentials');

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context(routes.login),
          callHandler(() => throwError(() => failure)),
        ),
      ),
    ).rejects.toBe(failure);
    expect(settle).not.toHaveBeenCalled();
  });

  it('does nothing for a policy that gives nothing back', async () => {
    const { interceptor, settle, context } = build();

    await lastValueFrom(
      interceptor.intercept(
        context(routes.register),
        callHandler(() => of(1)),
      ),
    );
    expect(settle).not.toHaveBeenCalled();
  });

  it('does nothing for an undecorated route', async () => {
    const { interceptor, settle, context } = build();

    await lastValueFrom(
      interceptor.intercept(
        context(routes.open),
        callHandler(() => of(1)),
      ),
    );
    expect(settle).not.toHaveBeenCalled();
  });
});
