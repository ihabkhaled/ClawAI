import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities';

/**
 * Accepts a sibling SERVICE, not a user.
 *
 * `@Public()` on an internal route only lifts the user-JWT guard; on its own it
 * leaves the route genuinely unauthenticated. This guard is what turns
 * "not a USER route" into "a SERVICE route", and it mirrors auth-service's and
 * routing-service's implementations deliberately — the three must agree on the
 * header format or the hop fails closed and looks like an outage.
 *
 * The public model catalog is served through here rather than as an open route:
 * the data is harmless (model names and capabilities, never a provider rate —
 * rule 37), but the endpoint is reached only by the frontend's server-side
 * fetch, so there is no reason to leave it open to the internet if nginx is
 * ever pointed at it.
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
