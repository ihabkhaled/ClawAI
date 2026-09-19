import { createHash } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  OPS_AUTH_SCHEME,
  OPS_SCOPE_LOGS_READ,
  OPS_TOKEN_CACHE_MAX_ENTRIES,
  OPS_TOKEN_CACHE_TTL_MS,
  OPS_TOKEN_VERIFY_PATH,
  OPS_TOKEN_VERIFY_TIMEOUT_MS,
} from '../constants/ops-access.constants';
import type { CachedOpsVerification, OpsTokenVerification } from '../types/ops-access.types';

/**
 * Admits a read-only ops token (`Authorization: Ops claw_ops_...`) for the
 * log read routes, so an operator or an agent can read production logs over
 * HTTPS without SSH and without a browser session (ADR-102).
 *
 * auth-service owns the tokens and answers verify; a verified token is cached
 * for 30 s keyed by its SHA-256, never by the token itself. Every refusal is
 * the same 401, and nothing here logs the token.
 */
@Injectable()
export class OpsTokenGuard implements CanActivate {
  private readonly logger = new Logger(OpsTokenGuard.name);
  private readonly cache = new Map<string, CachedOpsVerification>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; opsTokenId?: string }>();
    const header = request.headers?.['authorization'] ?? '';
    if (!header.startsWith(OPS_AUTH_SCHEME)) {
      throw new UnauthorizedException('Ops token required');
    }
    const token = header.slice(OPS_AUTH_SCHEME.length).trim();
    const key = createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached !== undefined && cached.expiresAt > now) {
      request.opsTokenId = cached.tokenId;
      return true;
    }
    const verification = await this.verify(token);
    if (!verification.valid || verification.tokenId === null) {
      this.cache.delete(key);
      throw new UnauthorizedException('Invalid ops token');
    }
    this.remember(key, verification.tokenId, now);
    request.opsTokenId = verification.tokenId;
    this.logger.log(`canActivate: ops token ${verification.tokenId} admitted`);
    return true;
  }

  private async verify(token: string): Promise<OpsTokenVerification> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<OpsTokenVerification>({
        url: `${config.AUTH_SERVICE_URL}${OPS_TOKEN_VERIFY_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        body: { token, scope: OPS_SCOPE_LOGS_READ },
        timeoutMs: OPS_TOKEN_VERIFY_TIMEOUT_MS,
      });
      return response.ok ? response.data : { valid: false, tokenId: null, scopes: [] };
    } catch (error: unknown) {
      this.logger.warn(`verify: auth-service unreachable - ${(error as Error).message}`);
      return { valid: false, tokenId: null, scopes: [] };
    }
  }

  private remember(key: string, tokenId: string, now: number): void {
    if (this.cache.size >= OPS_TOKEN_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (oldest.done !== true) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(key, { tokenId, expiresAt: now + OPS_TOKEN_CACHE_TTL_MS });
  }
}
