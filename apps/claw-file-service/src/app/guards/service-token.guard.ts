import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AppConfig } from '../config/app.config';
import { constantTimeEqual } from '../../common/utilities/constant-time-equal.utility';

/**
 * Stream 22 — guards the file-service `/upload-internal` and
 * `/download-internal` endpoints with a service-token shared secret.
 * Header form: `Authorization: Service <token>`. Comparison uses
 * `timingSafeEqual` to defeat byte-by-byte timing attacks.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers?.['authorization'];
    if (header === undefined || !header.startsWith('Service ')) {
      throw new UnauthorizedException('Service token required');
    }
    const provided = header.slice('Service '.length);
    const expected = AppConfig.get().INTER_SERVICE_AUTH_TOKEN;
    if (!constantTimeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
