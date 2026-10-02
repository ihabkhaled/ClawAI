import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import { AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS } from '../constants/auth-rate-limit.constants';

/**
 * Fixed-window counters for the sign-in / sign-up routes.
 *
 * **Fails OPEN.** When Redis errors or does not answer within
 * AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS the hit returns `null` and the request goes
 * through, with a warning. A Redis outage must never lock every user out of
 * sign-in; nginx's coarse `limit_req` on /api/v1/auth/ still bounds a flood
 * while Redis is down (owner decision 2026-10-02, rules/58).
 */
@Injectable()
export class AuthRateLimitRepository {
  private readonly logger = new Logger(AuthRateLimitRepository.name);

  constructor(private readonly redis: RedisService) {}

  async hit(key: string, windowSeconds: number): Promise<FixedWindowHit | null> {
    return this.bounded('hit', () => this.redis.incrementWindow(key, windowSeconds));
  }

  /** Deletes a window after a success. A failure only means it stays counted. */
  async reset(key: string): Promise<void> {
    await this.bounded('reset', () => this.redis.del(key));
  }

  /** Gives one hit back after a success, never below zero. */
  async refund(key: string): Promise<void> {
    await this.bounded('refund', () => this.redis.refundWindow(key));
  }

  /**
   * Runs one Redis command with the limiter's time budget; on timeout or
   * error it warns and resolves `null`, so the request always goes through.
   */
  private async bounded<T>(operation: string, command: () => Promise<T>): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([command(), timeout]);
      if (result === null) {
        this.logger.warn(`auth rate limiter ${operation} timed out, allowing the request`);
      }
      return result;
    } catch (error: unknown) {
      // Never logs the key: it is derived from the address and the IP.
      this.logger.warn(
        `auth rate limiter ${operation} unavailable, allowing the request: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
