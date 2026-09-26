import { Injectable } from '@nestjs/common';
import { type MetricCounter, type MetricHistogram, MetricsRegistry } from '@claw/shared-utilities';

import type { ImageGenerationMetricOutcome } from '../../../common/enums';
import {
  IMAGE_GENERATION_DURATION_METRIC,
  IMAGE_GENERATION_METRIC,
  MS_PER_SECOND,
} from '../constants/image-media-metrics.constants';

/**
 * image-service's media metrics, scraped at `GET /api/v1/metrics` (internal
 * only). Recording never throws; an unknown provider is counted as `other`.
 */
@Injectable()
export class ImageMediaMetricsService {
  private readonly registry = new MetricsRegistry();
  private readonly generations: MetricCounter = this.registry.counter(IMAGE_GENERATION_METRIC);
  private readonly duration: MetricHistogram = this.registry.histogram(
    IMAGE_GENERATION_DURATION_METRIC,
  );

  recordGeneration(
    provider: string,
    outcome: ImageGenerationMetricOutcome,
    elapsedMs: number,
  ): void {
    this.generations.inc({ provider, outcome });
    this.duration.observe({ provider, outcome }, elapsedMs / MS_PER_SECOND);
  }

  render(): string {
    return this.registry.render();
  }
}
