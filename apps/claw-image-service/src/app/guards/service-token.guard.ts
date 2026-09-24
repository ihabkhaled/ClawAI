import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';
import type { ServiceTokenRequest } from '../../common/types';

/**
 * Guards the internal image routes with the shared `INTER_SERVICE_AUTH_TOKEN`
 * (`Authorization: Service <token>`). They were `@Public()` with no guard:
 * anything that could reach the service could start, read or retry — and bill
 * — any user's generation, since the body names the `userId`. Mirrors
 * file-generation-service's `ServiceTokenGuard`.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ServiceTokenRequest>();
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
