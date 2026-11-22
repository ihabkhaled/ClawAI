import { Global, Module } from '@nestjs/common';

import { LIVE_EVENT_PUBLISHER } from './constants/realtime.tokens';
import { LiveStreamController } from './controllers/live-stream.controller';
import { LiveSseManager } from './managers/live-sse.manager';
import { LiveSseSessionRepository } from './repositories/live-sse-session.repository';
import { RedisLiveEventBus } from './services/redis-live-event-bus.service';

/**
 * Run event transport (Redis pub/sub + replay list) and the viewer SSE stream.
 * Exports the publisher under LIVE_EVENT_PUBLISHER for workers and billing. Global so the
 * processing module's RunEventEmitter resolves it without importing this module.
 */
@Global()
@Module({
  controllers: [LiveStreamController],
  providers: [
    RedisLiveEventBus,
    { provide: LIVE_EVENT_PUBLISHER, useExisting: RedisLiveEventBus },
    LiveSseManager,
    LiveSseSessionRepository,
  ],
  exports: [LIVE_EVENT_PUBLISHER, RedisLiveEventBus],
})
export class RealtimeModule {}
