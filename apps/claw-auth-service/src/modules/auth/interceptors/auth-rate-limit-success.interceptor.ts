import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { concatMap, type Observable } from 'rxjs';

import { AUTH_RATE_LIMIT_METADATA_KEY } from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitService } from '../services/auth-rate-limit.service';
import { readAuthRateLimitSubject } from '../utilities/auth-rate-limit-key.utility';

/**
 * Gives sign-in budget back once the handler SUCCEEDED (rules/58 item 10).
 *
 * Runs only on the success path: a failed login throws before `concatMap`,
 * so a wrong password stays counted. The response waits for the refund (it is
 * bounded by the limiter's Redis timeout and never throws), so the next
 * request from the same caller already sees the lower count.
 */
@Injectable()
export class AuthRateLimitSuccessInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const policy = this.reflector.get<AuthRateLimitPolicy | undefined>(
      AUTH_RATE_LIMIT_METADATA_KEY,
      context.getHandler(),
    );
    if (policy === undefined || !this.rateLimit.refundsOnSuccess(policy)) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      concatMap(async (value: unknown) => {
        await this.rateLimit.settle(policy, await readAuthRateLimitSubject(request));
        return value;
      }),
    );
  }
}
