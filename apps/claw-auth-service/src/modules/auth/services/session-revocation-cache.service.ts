import { Injectable, Logger } from '@nestjs/common';
import { revokedSessionKey } from '@claw/shared-constants';

import { AppConfig } from '../../../app/config/app.config';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { DEFAULT_ACCESS_TOKEN_TTL_SECONDS } from '../constants/token-session.constants';
import { expirySeconds } from '../utilities/expiry-seconds.utility';

/**
 * Tells every service that a session is gone before its access token expires
 * (TD-033).
 *
 * A revoked session is a database fact, but a signed access token is not read
 * from the database: after a logout, or after a family was revoked for token
 * theft, that token kept working for up to `JWT_ACCESS_EXPIRY`. Every
 * service's AuthGuard now asks Redis, and this writes what it reads.
 *
 * The TTL is that same lifetime, so the entry disappears exactly when the
 * token it describes could no longer be accepted anyway.
 *
 * Writing is best-effort. A revocation must not fail because Redis is down —
 * the database is still the truth, the refresh path still refuses, and the
 * guard falls back to the old behaviour for at most one token lifetime.
 */
@Injectable()
export class SessionRevocationCacheService {
  private readonly logger = new Logger(SessionRevocationCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async revoke(sessionIds: readonly string[]): Promise<void> {
    if (sessionIds.length === 0) {
      return;
    }
    const ttlSeconds = expirySeconds(
      AppConfig.get().JWT_ACCESS_EXPIRY,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          await this.redis.set(revokedSessionKey(sessionId), '1', ttlSeconds);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'unknown error';
          this.logger.warn(
            `revoke: session ${sessionId} not cached — tokens accepted until expiry (${message})`,
          );
        }
      }),
    );
  }
}
