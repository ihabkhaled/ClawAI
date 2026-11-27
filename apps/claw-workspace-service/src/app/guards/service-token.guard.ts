import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

/**
 * Accepts a sibling SERVICE, not a user.
 *
 * workspace-service's `internal/*` routes were `@Public()` with no second check
 * (security audit 2026-11-27): `internal/workspace/search` took a `userId` in
 * the body and returned that user's workspace objects to anything on the Docker
 * network. "nginx does not route /api/v1/internal/*" is a network fact, not an
 * authorisation.
 *
 * Mirrors memory-service, chat-service and auth-service deliberately: they must
 * agree on the header format (`Authorization: Service <token>`), or the hop
 * fails closed and looks like an outage.
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
