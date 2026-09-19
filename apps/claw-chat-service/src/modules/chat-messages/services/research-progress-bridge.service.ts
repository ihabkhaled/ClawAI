import { createHash } from 'node:crypto';

import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RESEARCH_CRAWL_PROGRESS_CHANNEL } from '@claw/shared-constants';

import { RESEARCH_PROGRESS_SUBSCRIBER_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import type { RedisSubscriberPort } from '../../../infrastructure/redis/types/redis-client.types';
import { describeStreamError } from '../utilities/chat-stream-frame.utility';
import { mapCrawlPhaseToResearchProgress } from '../utilities/research-progress-bridge.utility';
import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import { NARRATED_CRAWL_PHASES } from '../constants/narration.constants';
import { NarrationService } from './narration.service';
import { ChatStreamService } from './chat-stream.service';
import type { ResearchCrawlProgressMessage } from '@claw/shared-types';

/**
 * Forwards research-service's SITE_CRAWL progress ticks into this thread's
 * chat SSE stream.
 *
 * research-service and chat-service share one Redis instance (see ADR-092
 * amendment "live crawl progress"), so a crawl running in a different
 * process can still reach a stream this replica owns — the same
 * cross-replica pattern `StreamCancellationService` already uses for Stop,
 * just one-directional and read-only here. `correlationId` on the wire is
 * always this thread's id: `runResearchForIntent` is the only caller that
 * sets it, and it always sets it to `threadId`.
 */
@Injectable()
export class ResearchProgressBridgeService implements OnModuleInit {
  private readonly logger = new Logger(ResearchProgressBridgeService.name);

  constructor(
    @Inject(RESEARCH_PROGRESS_SUBSCRIBER_CLIENT) private readonly subscriber: RedisSubscriberPort,
    private readonly chatStreamService: ChatStreamService,
    private readonly narration: NarrationService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber.onMessage((channel, payload) => {
      if (channel !== RESEARCH_CRAWL_PROGRESS_CHANNEL) {
        return;
      }
      this.handleMessage(payload);
    });
    this.subscriber.onReady(() => {
      void this.subscribe();
    });
    await this.subscribe();
  }

  private handleMessage(rawPayload: string): void {
    let message: ResearchCrawlProgressMessage;
    try {
      message = JSON.parse(rawPayload) as ResearchCrawlProgressMessage;
    } catch (error: unknown) {
      this.logger.warn(`handleMessage: could not parse payload — ${describeStreamError(error)}`);
      return;
    }
    if (
      typeof message.correlationId !== 'string' ||
      message.correlationId.length === 0 ||
      typeof message.phase !== 'string'
    ) {
      this.logger.warn('handleMessage: payload missing correlationId or phase, dropping');
      return;
    }
    this.chatStreamService.emitResearchProgress(
      message.correlationId,
      mapCrawlPhaseToResearchProgress(message),
    );
    // Also a line in the turn's narrated work log ("Discovered 42 sitemap
    // URLs", "Reading /pricing"). The start and the finish are narrated by the
    // orchestrator with what was actually READ, so only the steps between are
    // taken from here. Every replica receives this tick; the payload itself is
    // the dedupe key, so exactly one replica logs it.
    if (NARRATED_CRAWL_PHASES.has(message.phase)) {
      void this.narration.append(
        message.correlationId,
        {
          kind: NarrationKind.CRAWL_PROGRESS,
          params: {
            phase: message.phase,
            message: message.message,
            pagesFetched: message.pagesFetched,
            pagesDiscovered: message.pagesDiscovered,
          },
        },
        createHash('sha1').update(rawPayload).digest('hex'),
      );
    }
  }

  private async subscribe(): Promise<void> {
    try {
      await this.subscriber.subscribe(RESEARCH_CRAWL_PROGRESS_CHANNEL);
      this.logger.log(`subscribed to ${RESEARCH_CRAWL_PROGRESS_CHANNEL}`);
    } catch (error: unknown) {
      this.logger.error(`subscribe: failed — ${describeStreamError(error)}`);
    }
  }
}
