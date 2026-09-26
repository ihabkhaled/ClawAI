import { Global, Module } from '@nestjs/common';

import { MetricsController } from './controllers/metrics.controller';
import { ImageMediaMetricsService } from './services/image-media-metrics.service';

/** Global so any manager can record without importing the module (one registry per process). */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [ImageMediaMetricsService],
  exports: [ImageMediaMetricsService],
})
export class MetricsModule {}
