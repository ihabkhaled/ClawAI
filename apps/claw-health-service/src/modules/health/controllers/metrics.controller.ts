import { Controller, Get, Header } from '@nestjs/common';

import { MetricsService } from '../services/metrics.service';

/**
 * What Prometheus scrapes (ADR-113).
 *
 * Reachable only inside the Docker network: nginx proxies `/api/v1/health`
 * and does not proxy this path, so it is not on the public surface. The
 * numbers are infrastructure identity only — a service name, whether it
 * answered, and how long it took (rules/19).
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(): Promise<string> {
    return this.metricsService.render();
  }
}
