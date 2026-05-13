import { ForbiddenException, type ExecutionContext } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AdminIpAllowlistGuard } from '../admin-ip-allowlist.guard';

const makeCtx = (req: Partial<{ ip: string; headers: Record<string, unknown> }>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ ip: req.ip, headers: req.headers ?? {} }),
    }),
  }) as unknown as ExecutionContext;

const makeConfig = (allowlist: string): ReturnType<typeof AppConfig.get> =>
  ({ ADMIN_IP_ALLOWLIST: allowlist }) as unknown as ReturnType<typeof AppConfig.get>;

describe('AdminIpAllowlistGuard', () => {
  let guard: AdminIpAllowlistGuard;

  beforeEach(() => {
    guard = new AdminIpAllowlistGuard();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through when the allowlist is empty (disabled)', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig(''));
    const ctx = makeCtx({ ip: '203.0.113.7' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes through when the allowlist is only whitespace', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig('  ,  ,'));
    const ctx = makeCtx({ ip: '203.0.113.7' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a request whose client IP is in the allowlist', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig('10.0.0.1, 10.0.0.2'));
    const ctx = makeCtx({ ip: '10.0.0.2' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies a request whose client IP is not in the allowlist', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig('10.0.0.1'));
    const ctx = makeCtx({ ip: '203.0.113.7' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies when the IP cannot be resolved', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig('10.0.0.1'));
    const ctx = makeCtx({ headers: {} });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('honors X-Forwarded-For when set (uses first hop as client IP)', () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(makeConfig('10.0.0.2'));
    const ctx = makeCtx({
      ip: '127.0.0.1', // proxy IP
      headers: { 'x-forwarded-for': '10.0.0.2, 192.0.2.99' }, // real client
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
