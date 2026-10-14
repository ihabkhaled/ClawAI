import { UnauthorizedException } from '@nestjs/common';

import { ServiceTokenGuard } from '../service-token.guard';

const TOKEN = 'inter-service-token-0123456789-abcdef';

vi.mock('../../config/app.config', () => ({
  AppConfig: { get: () => ({ INTER_SERVICE_AUTH_TOKEN: 'inter-service-token-0123456789-abcdef' }) },
}));

const contextWith = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  }) as never;

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();

  it('lets the service token through', () => {
    expect(guard.canActivate(contextWith(`Service ${TOKEN}`))).toBe(true);
  });

  it.each([
    ['no header', undefined],
    ['a user bearer token', 'Bearer abc.def.ghi'],
    ['the wrong service token', 'Service not-the-token'],
    ['a token of the right length but wrong bytes', `Service ${TOKEN.replace(/.$/, 'X')}`],
    ['an empty service token', 'Service '],
  ])('refuses %s', (_label, header) => {
    expect(() => guard.canActivate(contextWith(header))).toThrow(UnauthorizedException);
  });
});
