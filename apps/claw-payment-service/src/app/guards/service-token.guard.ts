import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const authorization = request.headers['authorization'];
    if (authorization?.startsWith('Service ') !== true) {
      throw new UnauthorizedException('Service token required');
    }
    const provided = authorization.slice('Service '.length);
    if (!constantTimeEqual(provided, AppConfig.get().INTER_SERVICE_AUTH_TOKEN)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
