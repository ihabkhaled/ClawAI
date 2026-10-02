import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import { AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS } from '../constants/agent-auth-rate-limit.constants';

/**
 * Fixed-window counters for the public device sign-in routes.
 *
 * **Fails OPEN**: a Redis error or a hit slower than the timeout returns null
 * and the request goes through, with a warning. nginx's `limit_req` on
 * /api/v1/agent/auth/ still bounds a flood while Redis is down (rules/58).
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
      const result = await Promise.race([this.redis.incrWithTtl(key, windowSeconds), timeout]);
      if (result === null) {
        this.logger.warn('agent auth rate limiter timed out, allowing the request');
      }
      return result;
    } catch (error: unknown) {
      // Never logs the key: it is derived from the IP or the pairing code.
      this.logger.warn(
        `agent auth rate limiter unavailable, allowing the request: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
