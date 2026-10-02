import { applyDecorators, SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';

import { AUTH_RATE_LIMIT_METADATA_KEY } from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import { AuthRateLimitSuccessInterceptor } from '../interceptors/auth-rate-limit-success.interceptor';

/** Puts a public sign-in / sign-up route under its per-route budget (rules/58). */
export function AuthRateLimit(policy: AuthRateLimitPolicy): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    SetMetadata(AUTH_RATE_LIMIT_METADATA_KEY, policy),
    UseGuards(AuthRateLimitGuard),
    UseInterceptors(AuthRateLimitSuccessInterceptor),
  );
}
