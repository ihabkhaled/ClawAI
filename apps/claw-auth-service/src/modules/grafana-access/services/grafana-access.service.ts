import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { revokedSessionKey } from '@claw/shared-constants';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import type { AuthenticatedUser } from '../../../common/types';
import { deriveScopedKey, signScopedToken, verifyScopedToken } from '../../../common/utilities';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { DEFAULT_ACCESS_TOKEN_TTL_SECONDS } from '../../auth/constants/token-session.constants';
import { expirySeconds } from '../../auth/utilities/expiry-seconds.utility';
import {
  GRAFANA_ACCESS_AUDIENCE,
  GRAFANA_ACCESS_DENIED_CODE,
  GRAFANA_ACCESS_DENIED_MESSAGE,
  GRAFANA_ACCESS_ISSUER,
  GRAFANA_ACCESS_KEY_CONTEXT,
  GRAFANA_ACCESS_MAX_TTL_SECONDS,
} from '../constants/grafana-access.constants';
import {
  type GrafanaAccessClaims,
  grafanaAccessClaimsSchema,
} from '../schemas/grafana-access-claims.schema';
import type { GrafanaAccessGrant, GrafanaAccessIdentity } from '../types/grafana-access.types';
import { readGrafanaAccessCookie } from '../utilities/grafana-access-cookie.utility';

/**
 * Mints and checks the cookie that lets an admin's browser through nginx to
 * Grafana (ADR-115). There is no second login: the cookie is derived from the
 * admin's own session, and dies with it.
 *
 * Nothing is stored. The cookie is a signed token naming the user and the
 * session; checking it is a signature check plus the same revocation lookup
 * every other service does (ADR-112).
 */
@Injectable()
export class GrafanaAccessService {
  private readonly logger = new Logger(GrafanaAccessService.name);

  constructor(private readonly redis: RedisService) {}

  grant(user: AuthenticatedUser, now: Date = new Date()): GrafanaAccessGrant {
    const maxAgeSeconds = this.lifetimeSeconds();
    const token = signScopedToken(
      { sub: user.id, email: user.email, sid: user.sessionId },
      this.key(),
      {
        audience: GRAFANA_ACCESS_AUDIENCE,
        issuer: GRAFANA_ACCESS_ISSUER,
        expiresInSeconds: maxAgeSeconds,
      },
    );
    return {
      token,
      maxAgeSeconds,
      expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000).toISOString(),
    };
  }

  async verify(cookieHeader: string | undefined): Promise<GrafanaAccessIdentity> {
    const cookieValue = readGrafanaAccessCookie(cookieHeader);
    if (cookieValue === null) {
      throw this.denied();
    }
    const claims = this.parse(cookieValue);
    if (await this.isRevoked(claims.sid)) {
      throw this.denied();
    }
    return { email: claims.email };
  }

  /**
   * The smaller of the cap and the access-token lifetime. The second bound is
   * what keeps revocation honest: Redis forgets a revoked session after one
   * access-token lifetime, so a cookie must never live longer than that.
   */
  lifetimeSeconds(): number {
    const accessTtl = expirySeconds(
      AppConfig.get().JWT_ACCESS_EXPIRY,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
    return Math.min(accessTtl, GRAFANA_ACCESS_MAX_TTL_SECONDS);
  }

  private parse(token: string): GrafanaAccessClaims {
    let raw: unknown;
    try {
      raw = verifyScopedToken(token, this.key(), {
        audience: GRAFANA_ACCESS_AUDIENCE,
        issuer: GRAFANA_ACCESS_ISSUER,
      });
    } catch {
      throw this.denied();
    }
    const parsed = grafanaAccessClaimsSchema.safeParse(raw);
    if (!parsed.success) {
      throw this.denied();
    }
    return parsed.data;
  }

  /**
   * Fails OPEN, like every other revocation check (ADR-112): Grafana is what an
   * operator opens during an incident, and a Redis outage is an incident. The
   * cost is bounded by the cookie's lifetime, which is never longer than the
   * access token's.
   */
  private async isRevoked(sessionId: string): Promise<boolean> {
    try {
      return (await this.redis.get(revokedSessionKey(sessionId))) !== null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`verify: revocation cache unreadable, accepting the cookie (${message})`);
      return false;
    }
  }

  private key(): string {
    return deriveScopedKey(AppConfig.get().JWT_SECRET, GRAFANA_ACCESS_KEY_CONTEXT);
  }

  private denied(): BusinessException {
    return new BusinessException(
      GRAFANA_ACCESS_DENIED_MESSAGE,
      GRAFANA_ACCESS_DENIED_CODE,
      HttpStatus.UNAUTHORIZED,
    );
  }
}
