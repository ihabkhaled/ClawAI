import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

/**
 * Guards log WRITES with the shared `INTER_SERVICE_AUTH_TOKEN`.
 * Header form: `Authorization: Service <token>`.
 *
 * The write routes were `@Public()` and nginx proxies this service, so on
 * 2026-09-19 `POST https://claw-ai.co/api/v1/server-logs` answered anyone on
 * the internet: a forged ERROR line or a flood could be written into the log
 * store operators trust. Nothing legitimate writes over HTTP without the
 * token (services publish `log.server` over RabbitMQ; the log shipper holds
 * the token).
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
