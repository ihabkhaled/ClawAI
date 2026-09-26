import { Global, Module } from '@nestjs/common';

import { MetricsController } from './controllers/metrics.controller';
import { ChatMediaMetricsService } from './services/chat-media-metrics.service';

/** Global so any manager can record without importing the module (one registry per process). */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [ChatMediaMetricsService],
  exports: [ChatMediaMetricsService],
})
export class MetricsModule {}
