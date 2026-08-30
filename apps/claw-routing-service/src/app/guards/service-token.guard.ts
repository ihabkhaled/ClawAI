import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

/**
 * Accepts a sibling SERVICE, not a user.
 *
 * The global `AuthGuard` expects a user JWT, so an internal caller presenting
 * `Authorization: Service <token>` was rejected with 401 — which is how
 * auth-service's model-rate lookup failed, and with it every pay-as-you-go
 * reservation in the product. Marking the existing user-facing cost route
 * `@Public()` would have "fixed" it by publishing the rate card, so the
 * internal route gets its own guard instead.
 *
 * Mirrors auth-service's ServiceTokenGuard deliberately: the two must agree on
 * the header format, or the hop fails closed and looks like an outage.
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
