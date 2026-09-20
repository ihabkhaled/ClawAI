import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';
import { HealthService } from './services/health.service';
import { MetricsService } from './services/metrics.service';

@Module({
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService],
})
export class HealthModule {}
