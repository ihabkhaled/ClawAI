import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities';

/**
 * Guards internal service-to-service endpoints with the shared
 * `INTER_SERVICE_AUTH_TOKEN` secret. Header form: `Authorization: Service <token>`.
 *
 * This is stricter than the `@Public()` treatment the older internal endpoints
 * use, and deliberately so: the plan-catalog endpoints it protects are the
 * source of truth for what a subscription costs. An unauthenticated caller who
 * could read — or worse, be spoofed into answering — that API would be able to
 * influence what a customer is charged.
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
