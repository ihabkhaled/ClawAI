import { Inject, Injectable, Logger } from '@nestjs/common';

import { LIVE_EVENT_PUBLISHER } from '../../realtime/constants/realtime.tokens';
import type {
  LiveEventPublisher,
  LiveStreamEvent,
} from '../../realtime/types/live-stream-event.types';

/**
 * Publishes run events after their rows are committed. A fan-out failure is logged and
 * swallowed: the rows are durable and the SSE replay reads them, so the worker goes on.
 */
@Injectable()
export class RunEventEmitter {
  private readonly logger = new Logger(RunEventEmitter.name);

  constructor(@Inject(LIVE_EVENT_PUBLISHER) private readonly publisher: LiveEventPublisher) {}

  async emit(events: readonly LiveStreamEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.publisher.publish(event);
      } catch {
        this.logger.warn(`live event ${event.type} for run ${event.runId} not published`);
      }
    }
  }
}
