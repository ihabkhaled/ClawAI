import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import { AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS } from '../constants/agent-auth-rate-limit.constants';

/**
 * Fixed-window counters for the public device sign-in routes.
 *
 * **Fails CLOSED** (owner decision 2026-11-28, rules/58 item 7, ADR-230): a
 * Redis error, a hit slower than the timeout or a malformed reply returns
 * null; the service then throws AgentAuthRateLimitUnavailableError and the guard turns it into a 503.
 */
@Injectable()
export class AgentAuthRateLimitRepository {
  private readonly logger = new Logger(AgentAuthRateLimitRepository.name);

  constructor(private readonly redis: RedisService) {}

  async hit(key: string, windowSeconds: number): Promise<FixedWindowHit | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([
        this.redis.incrWithTtlStrict(key, windowSeconds),
        timeout,
      ]);
      if (result === null) {
        this.logger.error('agent auth rate limiter timed out, refusing the request');
        return null;
      }
      return result;
    } catch (error: unknown) {
      // Never logs the key: it is derived from the IP or the pairing code.
      this.logger.error(
        `agent auth rate limiter unavailable, refusing the request: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
