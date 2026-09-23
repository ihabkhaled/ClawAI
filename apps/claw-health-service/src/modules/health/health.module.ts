import { Module } from '@nestjs/common';
import { PrometheusAdapter } from './adapters/prometheus.adapter';
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';
import { StatusPageController } from './controllers/status-page.controller';
import { StatusHistoryManager } from './managers/status-history.manager';
import { HealthSnapshotService } from './services/health-snapshot.service';
import { HealthService } from './services/health.service';
import { MetricsService } from './services/metrics.service';
import { StatusPageService } from './services/status-page.service';

@Module({
  controllers: [HealthController, MetricsController, StatusPageController],
  providers: [
    HealthService,
    HealthSnapshotService,
    MetricsService,
    PrometheusAdapter,
    StatusHistoryManager,
    StatusPageService,
  ],
})
export class HealthModule {}
