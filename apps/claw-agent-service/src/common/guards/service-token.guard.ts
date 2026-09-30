import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AppConfig } from '../../app/config/app.config';
import { SERVICE_TOKEN_SCHEME } from '../constants/service-token.constants';
import { constantTimeEquals } from '../utilities/token.utility';

/**
 * Admits only a sibling service holding the shared `INTER_SERVICE_AUTH_TOKEN`.
 * Header form: `Authorization: Service <token>`.
 *
 * Fails closed: with no token configured every call is refused, so a missing
 * secret can never turn an internal route into a public one. nginx already
 * refuses `/api/v1/internal/*` at the edge; this is the second wall.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers['authorization'] ?? '';
    const expected = AppConfig.get().INTER_SERVICE_AUTH_TOKEN;
    if (expected === undefined || !header.startsWith(SERVICE_TOKEN_SCHEME)) {
      throw new UnauthorizedException('Service token required');
    }
    if (!constantTimeEquals(header.slice(SERVICE_TOKEN_SCHEME.length), expected)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
