import { vi } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

/**
 * workspace-service's internal search takes a `userId` in the body and returns
 * that user's workspace objects. Before this guard it was `@Public()` with no
 * second check, so anything that could reach the container could read any
 * user's workspace by guessing an id.
 */

const TOKEN = 'x'.repeat(48);

function contextWithHeader(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({ INTER_SERVICE_AUTH_TOKEN: TOKEN } as ReturnType<
      typeof AppConfig.get
    >);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('admits a sibling service presenting the shared token', () => {
    expect(guard.canActivate(contextWithHeader(`Service ${TOKEN}`))).toBe(true);
  });

  it('refuses a request with no Authorization header', () => {
    expect(() => guard.canActivate(contextWithHeader(undefined))).toThrow(UnauthorizedException);
  });

  it('refuses a USER JWT', () => {
    // A user token is not a service identity: accepting one would let any
    // signed-in customer search another customer's workspace by id.
    expect(() => guard.canActivate(contextWithHeader('Bearer some.jwt.value'))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses the right scheme with the wrong token', () => {
    expect(() => guard.canActivate(contextWithHeader(`Service ${'y'.repeat(48)}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token that is merely a prefix of the real one', () => {
    expect(() => guard.canActivate(contextWithHeader(`Service ${TOKEN.slice(0, 20)}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses an empty token after the scheme', () => {
    expect(() => guard.canActivate(contextWithHeader('Service '))).toThrow(UnauthorizedException);
  });

  it('does not accept a lowercase scheme', () => {
    // Header VALUES are case-sensitive even though header names are not.
    expect(() => guard.canActivate(contextWithHeader(`service ${TOKEN}`))).toThrow(
      UnauthorizedException,
    );
  });
});
