import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { SERVICE_AUTH_SCHEME } from '../constants/service-token.constants';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';
import { AppConfig } from '../config/app.config';

/**
 * Guards the internal service-to-service routes (chat-service resolving and running a mentioned
 * plugin's tools) with the shared `INTER_SERVICE_AUTH_TOKEN`. Header form:
 * `Authorization: Service <token>`. These routes take the owner's user id in the body, so the
 * token is the only thing standing between the network and "run a tool as any user".
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers['authorization'] ?? '';
    if (!header.startsWith(SERVICE_AUTH_SCHEME)) {
      throw new UnauthorizedException('Service token required');
    }
    const provided = header.slice(SERVICE_AUTH_SCHEME.length);
    if (!constantTimeEqual(provided, AppConfig.get().INTER_SERVICE_AUTH_TOKEN)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
