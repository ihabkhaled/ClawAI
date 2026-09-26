import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PROMETHEUS_TEXT_CONTENT_TYPE } from '@claw/shared-utilities';

import { Public } from '../../../app/decorators/public.decorator';
import { FileMediaMetricsService } from '../services/file-media-metrics.service';

/**
 * What Prometheus scrapes on file-service (ADR-113 addendum
 * "media metrics"). Reachable only inside the Docker network: nginx has no
 * `/api/v1/metrics` location, so the path falls to the frontend. Counts only,
 * labelled by bounded enums — nothing about a user (rules/19).
 */
@Controller('metrics')
@Public()
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metrics: FileMediaMetricsService) {}

  @Get()
  @Header('Content-Type', PROMETHEUS_TEXT_CONTENT_TYPE)
  scrape(): string {
    return this.metrics.render();
  }
}
