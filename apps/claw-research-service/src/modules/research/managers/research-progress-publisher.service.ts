import { Injectable, Logger } from '@nestjs/common';
import { RESEARCH_CRAWL_PROGRESS_CHANNEL } from '@claw/shared-constants';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { ResearchCrawlProgressMessage } from '@claw/shared-types';

/**
 * Publishes a `SITE_CRAWL` run's progress to Redis pub/sub, for chat-service
 * to forward into its own chat SSE stream. Fire-and-forget, same as
 * `ChatStreamBusService.publish()` on the chat-service side: a progress tick
 * that never arrives costs nothing, so a Redis hiccup logs a warning and the
 * crawl itself continues unaffected.
 *
 * `correlationId` is optional and opaque — research-service does not know
 * it is a thread id, only that the caller wants ticks routed somewhere. No
 * caller means no publish at all, not a publish to a well-known default
 * channel nobody is listening on.
 */
@Injectable()
export class ResearchProgressPublisher {
  private readonly logger = new Logger(ResearchProgressPublisher.name);

  constructor(private readonly redis: RedisService) {}

  publish(
    correlationId: string | undefined,
    phase: ResearchCrawlProgressMessage['phase'],
    message: string,
    pagesFetched: number,
    pagesDiscovered: number,
  ): void {
    if (correlationId === undefined) {
      return;
    }
    const payload: ResearchCrawlProgressMessage = {
      correlationId,
      phase,
      message,
      pagesFetched,
      pagesDiscovered,
      timestamp: new Date().toISOString(),
    };
    this.redis
      .publish(RESEARCH_CRAWL_PROGRESS_CHANNEL, JSON.stringify(payload))
      .catch((error: unknown) => {
        const description = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`publish: failed to publish progress tick — ${description}`);
      });
  }
}
