import { GUARDS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';

import { AUTH_RATE_LIMIT_METADATA_KEY } from '../../constants/auth-rate-limit.constants';
import { AuthRateLimitPolicy } from '../../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitGuard } from '../../guards/auth-rate-limit.guard';
import { AuthRateLimitSuccessInterceptor } from '../../interceptors/auth-rate-limit-success.interceptor';
import { AuthRateLimit } from '../auth-rate-limit.decorator';

class Routes {
  @AuthRateLimit(AuthRateLimitPolicy.REGISTER)
  register(): void {}
}

describe('AuthRateLimit decorator', () => {
  const routes = new Routes();

  it('records the policy on the handler', () => {
    expect(Reflect.getMetadata(AUTH_RATE_LIMIT_METADATA_KEY, routes.register)).toBe(
      AuthRateLimitPolicy.REGISTER,
    );
  });

  it('attaches the guard that enforces it', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, routes.register)).toEqual([AuthRateLimitGuard]);
  });

  it('attaches the interceptor that gives budget back after a success', () => {
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, routes.register)).toEqual([
      AuthRateLimitSuccessInterceptor,
    ]);
  });
});
