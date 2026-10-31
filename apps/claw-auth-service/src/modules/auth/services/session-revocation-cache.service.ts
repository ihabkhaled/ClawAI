import { Injectable, Logger } from '@nestjs/common';
import { revokedSessionKey } from '@claw/shared-constants';

import { AppConfig } from '../../../app/config/app.config';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { REVOCATION_BATCH_SIZE } from '../../sessions/constants/session-admin.constants';
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

  /**
   * The same write for a large set (a system-wide kill, ADR-204): one pipelined round trip per
   * batch instead of one per id, and only one batch is held in memory. Best-effort like
   * {@link revoke}: a failed batch is logged and the rest still run, because the database
   * revocation already happened and the refresh path refuses regardless.
   * Returns how many ids were written.
   */
  async revokeBatch(sessionIds: readonly string[]): Promise<number> {
    if (sessionIds.length === 0) {
      return 0;
    }
    const ttlSeconds = expirySeconds(
      AppConfig.get().JWT_ACCESS_EXPIRY,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
    let written = 0;
    for (let start = 0; start < sessionIds.length; start += REVOCATION_BATCH_SIZE) {
      const chunk = sessionIds.slice(start, start + REVOCATION_BATCH_SIZE);
      try {
        const pipeline = this.redis.getClient().pipeline();
        for (const sessionId of chunk) {
          pipeline.set(revokedSessionKey(sessionId), '1', 'EX', ttlSeconds);
        }
        await pipeline.exec();
        written += chunk.length;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(
          `revokeBatch: ${String(chunk.length)} sessions not cached - tokens accepted until expiry (${message})`,
        );
      }
    }
    return written;
  }
}
