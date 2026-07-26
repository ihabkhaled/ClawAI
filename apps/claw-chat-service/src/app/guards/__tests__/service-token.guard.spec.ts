import type { ExecutionContext } from '@nestjs/common';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

function contextWithAuthorization(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();

  beforeEach(() => {
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'service-token-with-at-least-32-characters',
    } as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts the configured service token', () => {
    expect(
      guard.canActivate(
        contextWithAuthorization('Service service-token-with-at-least-32-characters'),
      ),
    ).toBe(true);
  });

  it.each([undefined, 'Bearer wrong', 'Service wrong'])(
    'rejects missing or invalid authorization %s',
    (authorization) => {
      expect(() => guard.canActivate(contextWithAuthorization(authorization))).toThrow();
    },
  );
});
