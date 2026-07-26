import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

const TOKEN = 'x'.repeat(48);

function contextWith(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceTokenGuard', () => {
  let guard: ServiceTokenGuard;

  beforeEach(() => {
    guard = new ServiceTokenGuard();
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ INTER_SERVICE_AUTH_TOKEN: TOKEN } as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('admits a request carrying the exact service token', () => {
    expect(guard.canActivate(contextWith(`Service ${TOKEN}`))).toBe(true);
  });

  it('rejects a missing Authorization header', () => {
    expect(() => guard.canActivate(contextWith())).toThrow(UnauthorizedException);
  });

  it('rejects a user JWT presented to a service endpoint', () => {
    // A Bearer token is a USER credential. Accepting one here would let any
    // logged-in customer read the price catalog's internal shape.
    expect(() => guard.canActivate(contextWith('Bearer some.jwt.value'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong token of the same length', () => {
    expect(() => guard.canActivate(contextWith(`Service ${'y'.repeat(48)}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a correct prefix that is truncated', () => {
    // Guards against a length-insensitive comparison admitting a prefix.
    expect(() => guard.canActivate(contextWith(`Service ${TOKEN.slice(0, 40)}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an empty token', () => {
    expect(() => guard.canActivate(contextWith('Service '))).toThrow(UnauthorizedException);
  });
});
