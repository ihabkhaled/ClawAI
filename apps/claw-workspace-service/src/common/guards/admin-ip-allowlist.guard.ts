import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppConfig } from '../../app/config/app.config';

// v3 round 7 (2026-05-12) — Prompt 12 polish: optional IP allowlist for
// admin endpoints. When `ADMIN_IP_ALLOWLIST` is empty (default), the
// guard is a no-op so existing deployments aren't broken. When set, the
// guard rejects any request whose client IP isn't in the list with 403
// + messageKey ADMIN_IP_DENIED.
//
// Apply via `@UseGuards(AdminIpAllowlistGuard)` on the controller class
// (e.g. AiActionPolicyController). The guard runs BEFORE AuthGuard since
// IP is checked at the network layer.

@Injectable()
export class AdminIpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(AdminIpAllowlistGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const allowlistRaw = AppConfig.get().ADMIN_IP_ALLOWLIST;
    if (allowlistRaw.length === 0) {
      // Disabled — skip.
      return true;
    }
    const allowed = allowlistRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (allowed.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.resolveClientIp(request);
    if (ip === null) {
      this.logger.warn('admin-ip-allowlist: could not resolve client IP — denying');
      throw new ForbiddenException({ messageKey: 'ADMIN_IP_DENIED' });
    }
    if (!allowed.includes(ip)) {
      this.logger.warn(`admin-ip-allowlist: ${ip} not in allowlist — denying`);
      throw new ForbiddenException({ messageKey: 'ADMIN_IP_DENIED' });
    }
    return true;
  }

  // Honors X-Forwarded-For when set by a trusted reverse proxy. The first
  // entry in the comma-separated list is the original client.
  resolveClientIp(request: Request): string | null {
    const xff = request.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      const first = xff.split(',')[0]?.trim();
      if (first !== undefined && first.length > 0) return first;
    }
    if (Array.isArray(xff) && xff.length > 0 && typeof xff[0] === 'string') {
      const first = xff[0].split(',')[0]?.trim();
      if (first !== undefined && first.length > 0) return first;
    }
    if (typeof request.ip === 'string' && request.ip.length > 0) return request.ip;
    return null;
  }
}
