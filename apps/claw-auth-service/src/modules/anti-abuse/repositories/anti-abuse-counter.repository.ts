import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import { ANTI_ABUSE_REDIS_TIMEOUT_MS } from '../constants/anti-abuse.constants';

/**
 * Redis counters and claims for the anti-abuse checks.
 *
 * **Fails OPEN**, exactly like the auth rate limiter: a Redis error or no reply
 * within ANTI_ABUSE_REDIS_TIMEOUT_MS resolves `null` with a warning, and every
 * caller reads `null` as "no evidence" (velocity not counted, a proof-of-work
 * salt not provably reused, no failed sign-ins). A Redis outage must never lock
 * every visitor out of sign-up; proof of work and the captchas still stand.
 * Keys are built by anti-abuse-key.utility and never logged.
 */
@Injectable()
export class AntiAbuseCounterRepository {
  private readonly logger = new Logger(AntiAbuseCounterRepository.name);

  constructor(private readonly redis: RedisService) {}

  /** One hit on a fixed window: the count including this hit and the seconds left. */
  async hit(key: string, windowSeconds: number): Promise<FixedWindowHit | null> {
    return this.bounded('hit', () => this.redis.incrementWindow(key, windowSeconds));
  }

  /** The current count of a window without counting a hit; 0 when it does not exist. */
  async read(key: string): Promise<number | null> {
    const raw = await this.bounded('read', async () => (await this.redis.get(key)) ?? '0');
    return raw === null ? null : Number.parseInt(raw, 10) || 0;
  }

  /** SET NX: true for the first claim, false when already claimed, null when unknown. */
  async claimOnce(key: string, ttlSeconds: number): Promise<boolean | null> {
    return this.bounded(
      'claim',
      async () => (await this.redis.claimCooldown(key, ttlSeconds)) === null,
    );
  }

  async reset(key: string): Promise<void> {
    await this.bounded('reset', () => this.redis.del(key));
  }

  private async bounded<T>(operation: string, command: () => Promise<T>): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ANTI_ABUSE_REDIS_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([command(), timeout]);
      if (result === null) {
        this.logger.warn(`anti-abuse ${operation} timed out, failing open`);
      }
      return result;
    } catch (error: unknown) {
      this.logger.warn(
        `anti-abuse ${operation} unavailable, failing open: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
