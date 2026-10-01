import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  FEEDBACK_PUBLIC_RATE_KEY_PREFIX,
  FEEDBACK_PUBLIC_WINDOW_SECONDS,
} from '../constants/feedback-public.constants';
import { hashRateKeyPart } from '../utilities/client-ip.utility';

/**
 * Fixed-window counters behind the public feedback route, keyed by a hash of
 * the client address and of the submitted email.
 *
 * Fails OPEN: when Redis is unreachable a hit counts as 0 and the submission
 * proceeds. This limiter is a courtesy against spam, not an authorization or
 * billing control, and nginx's `limit_req` on the same route still bounds the
 * flood. Failing closed would turn a Redis blip into "feedback is down".
 */
@Injectable()
export class FeedbackRateLimitRepository {
  private readonly logger = new Logger(FeedbackRateLimitRepository.name);

  constructor(private readonly redis: RedisService) {}

  hitIp(ip: string): Promise<number> {
    return this.hit(`ip:${hashRateKeyPart(ip)}`);
  }

  hitEmail(email: string): Promise<number> {
    return this.hit(`email:${hashRateKeyPart(email)}`);
  }

  private async hit(scope: string): Promise<number> {
    try {
      return await this.redis.incrementWindow(
        `${FEEDBACK_PUBLIC_RATE_KEY_PREFIX}${scope}`,
        FEEDBACK_PUBLIC_WINDOW_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `public feedback limiter unavailable, allowing the request — ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 0;
    }
  }
}
