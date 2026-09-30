import { vi } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';

vi.mock('../../../app/config/app.config');

const TOKEN = 'service-token-with-at-least-32-characters';

function contextWith(authorization: string | undefined): ExecutionContext {
  const request = { headers: { authorization } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as Pick<ExecutionContext, 'switchToHttp'> as ExecutionContext;
}

function configured(token: string | undefined): void {
  vi.mocked(AppConfig.get).mockReturnValue({
    INTER_SERVICE_AUTH_TOKEN: token,
  } as ReturnType<typeof AppConfig.get>);
}

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();

  it('admits the shared service token', () => {
    configured(TOKEN);
    expect(guard.canActivate(contextWith(`Service ${TOKEN}`))).toBe(true);
  });

  it('refuses a user bearer token, a wrong token and no header', () => {
    configured(TOKEN);
    expect(() => guard.canActivate(contextWith(`Bearer ${TOKEN}`))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith('Service wrong'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(UnauthorizedException);
  });

  it('fails closed when no token is configured', () => {
    configured(undefined);
    expect(() => guard.canActivate(contextWith('Service '))).toThrow(UnauthorizedException);
  });
});
