import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

jest.mock('../../config/app.config');

describe('ServiceTokenGuard', () => {
  const token = 'service-token-with-at-least-32-characters';
  const guard = new ServiceTokenGuard();

  beforeEach(() => {
    jest.mocked(AppConfig.get).mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: token,
    } as ReturnType<typeof AppConfig.get>);
  });

  it.each([
    ['missing token', undefined],
    ['wrong scheme', `Bearer ${token}`],
    ['wrong token', 'Service wrong-token-with-at-least-32-characters'],
  ])('rejects a %s', (_label, authorization) => {
    expect(() => guard.canActivate(buildContext(authorization))).toThrow(UnauthorizedException);
  });

  it('accepts the canonical service authorization header', () => {
    expect(guard.canActivate(buildContext(`Service ${token}`))).toBe(true);
  });
});

function buildContext(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as ExecutionContext;
}
