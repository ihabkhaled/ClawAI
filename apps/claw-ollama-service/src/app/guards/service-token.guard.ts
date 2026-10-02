import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { SERVICE_TOKEN_SCHEME_PREFIX } from '../../common/constants/service-token.constants';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';
import type { AuthenticatedRequest } from '../../common/types';

/**
 * Service-token-only lane for `/internal/ollama/*` (ADR-144). Those routes
 * were `@Public()` with no guard, so anything that could reach the service
 * could read the installed-model inventory. `@Public()` stays on them only to
 * skip the user-JWT guard; this guard is what authenticates them. A user JWT
 * is refused here on purpose — these are not user routes.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers?.authorization ?? '';
    if (!header.startsWith(SERVICE_TOKEN_SCHEME_PREFIX)) {
      throw new UnauthorizedException('Service token required');
    }
    const provided = header.slice(SERVICE_TOKEN_SCHEME_PREFIX.length);
    if (!constantTimeEqual(provided, AppConfig.get().INTER_SERVICE_AUTH_TOKEN)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
