import { Global, Module } from '@nestjs/common';

import { MetricsController } from './controllers/metrics.controller';
import { FileMediaMetricsService } from './services/file-media-metrics.service';

/** Global so any manager can record without importing the module (one registry per process). */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [FileMediaMetricsService],
  exports: [FileMediaMetricsService],
})
export class MetricsModule {}
