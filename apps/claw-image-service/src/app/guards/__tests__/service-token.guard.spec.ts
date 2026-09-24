import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

const TOKEN = 't'.repeat(40);

const contextWith = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  }) as never;

describe('ServiceTokenGuard (internal image routes)', () => {
  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({ INTER_SERVICE_AUTH_TOKEN: TOKEN } as never);
  });

  // /internal/images/* was @Public() with no guard: anything that could reach
  // the service could start a billed generation for any userId it named.
  it('refuses a caller with no token', () => {
    expect(() => new ServiceTokenGuard().canActivate(contextWith())).toThrow(UnauthorizedException);
  });

  it('refuses a user bearer token', () => {
    expect(() => new ServiceTokenGuard().canActivate(contextWith(`Bearer ${TOKEN}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a wrong service token, including one of a different length', () => {
    const guard = new ServiceTokenGuard();
    expect(() => guard.canActivate(contextWith(`Service ${'x'.repeat(40)}`))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWith('Service short'))).toThrow(UnauthorizedException);
  });

  it('admits the shared service token', () => {
    expect(new ServiceTokenGuard().canActivate(contextWith(`Service ${TOKEN}`))).toBe(true);
  });
});
