import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import { AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS } from '../constants/auth-rate-limit.constants';

/**
 * Fixed-window counters for the sign-in / sign-up routes.
 *
 * `hit` **fails CLOSED** (owner decision 2026-11-28, rules/58 item 7, ADR-230):
 * a Redis error, no answer within AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS or a
 * malformed reply returns null; the service then throws
 * AuthRateLimitUnavailableError and the guard turns it into a 503. `reset` and `refund` run AFTER a success and stay lenient: a
 * failure there only leaves the window counted.
 */
@Injectable()
export class AuthRateLimitRepository {
  private readonly logger = new Logger(AuthRateLimitRepository.name);

  constructor(private readonly redis: RedisService) {}

  async hit(key: string, windowSeconds: number): Promise<FixedWindowHit | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([
        this.redis.incrementWindowStrict(key, windowSeconds),
        timeout,
      ]);
      if (result === null) {
        // Never logs the key: it is derived from the address and the IP.
        this.logger.error('auth rate limiter hit timed out, refusing the request');
        return null;
      }
      return result;
    } catch (error: unknown) {
      this.logger.error(
        `auth rate limiter hit unavailable, refusing the request: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
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
   * Runs one post-success Redis command with the limiter's time budget; on
   * timeout or error it warns and resolves `null` (never fails a success).
   */
  private async bounded<T>(operation: string, command: () => Promise<T>): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([command(), timeout]);
      if (result === null) {
        this.logger.warn(`auth rate limiter ${operation} timed out`);
      }
      return result;
    } catch (error: unknown) {
      // Never logs the key: it is derived from the address and the IP.
      this.logger.warn(
        `auth rate limiter ${operation} unavailable: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
