import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { AppConfig } from '../config/app.config';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers['authorization'] ?? '';
    if (!header.startsWith('Service ')) throw new UnauthorizedException('Service token required');
    const provided = Buffer.from(header.slice('Service '.length));
    const expected = Buffer.from(AppConfig.get().INTER_SERVICE_AUTH_TOKEN);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Service token required');
    }
    return true;
  }
}
