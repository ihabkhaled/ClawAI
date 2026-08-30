import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

/**
 * Accepts a sibling SERVICE, not a user.
 *
 * memory-service's `internal/*` routes were `@Public()` with no second check at
 * all — five of the six services that expose internal routes already had this
 * guard and memory-service had none. They are not reachable from the internet:
 * nginx routes exactly one `/api/v1/internal/*` prefix (chat-shares) and the
 * rest fall through to the frontend, which is what the 2026-08-30 audit
 * measured. But "not routed by nginx" is one config line away from being false,
 * and the routes take a `userId` as a plain query parameter — anything that can
 * reach the container can read any user's memories.
 *
 * Mirrors routing-service and auth-service deliberately: the three must agree
 * on the header format, or the hop fails closed and looks like an outage.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers?.['authorization'] ?? '';
    if (!header.startsWith('Service ')) {
      throw new UnauthorizedException('Service token required');
    }
    const provided = header.slice('Service '.length);
    if (!constantTimeEqual(provided, AppConfig.get().INTER_SERVICE_AUTH_TOKEN)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
