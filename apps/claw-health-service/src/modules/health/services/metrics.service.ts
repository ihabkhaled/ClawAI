import { Injectable, Logger } from '@nestjs/common';
import { ServiceStatus } from '@claw/shared-types';

import {
  ALLOWED_METRIC_LABELS,
  METRIC_SERVICE_RESPONSE_MS,
  METRIC_SERVICE_UP,
  METRIC_SERVICES_TOTAL,
  METRIC_SERVICES_UP,
  METRIC_SNAPSHOT_AGE_MS,
  METRICS_SNAPSHOT_TTL_MS,
} from '../constants/metrics.constants';
import { type HealthSnapshot, type PrometheusMetric } from '../types/metrics.types';
import { renderMetrics } from '../utilities/prometheus-text.utility';
import { HealthService } from './health.service';

/**
 * The health fan-out, as Prometheus metrics (ADR-113).
 *
 * It measures nothing of its own: it is the same check the `/health` endpoint
 * answers with, cached, so that scraping cannot turn one request into 17
 * outbound calls on every interval.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private snapshot: HealthSnapshot | null = null;
  private inFlight: Promise<HealthSnapshot> | null = null;

  constructor(private readonly healthService: HealthService) {}

  async render(now: number = Date.now()): Promise<string> {
    const snapshot = await this.snapshotFor(now);
    return renderMetrics(this.metricsFrom(snapshot, now));
  }

  /**
   * The cached snapshot, refreshed when it is older than the TTL.
   *
   * Concurrent scrapes share one refresh: two scrapers arriving together
   * would otherwise both fan out to every service.
   */
  private async snapshotFor(now: number): Promise<HealthSnapshot> {
    if (this.snapshot && now - this.snapshot.takenAtMs < METRICS_SNAPSHOT_TTL_MS) {
      return this.snapshot;
    }
    this.inFlight ??= this.refresh(now).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(now: number): Promise<HealthSnapshot> {
    this.logger.debug('refresh: taking a health snapshot for the exporter');
    const snapshot: HealthSnapshot = {
      health: await this.healthService.checkAll(),
      takenAtMs: now,
    };
    this.snapshot = snapshot;
    return snapshot;
  }

  private metricsFrom(snapshot: HealthSnapshot, now: number): PrometheusMetric[] {
    const { services, summary } = snapshot.health;
    return [
      {
        name: METRIC_SERVICE_UP,
        help: 'Whether a service answered its health check (1) or did not (0).',
        type: 'gauge',
        samples: services.map((service) => ({
          value: service.status === ServiceStatus.UP ? 1 : 0,
          labels: { [ALLOWED_METRIC_LABELS[0] ?? 'service']: service.name },
        })),
      },
      {
        name: METRIC_SERVICE_RESPONSE_MS,
        help: 'How long a service took to answer its health check, in milliseconds.',
        type: 'gauge',
        samples: services
          .filter((service) => service.responseTimeMs !== null)
          .map((service) => ({
            value: service.responseTimeMs ?? Number.NaN,
            labels: { [ALLOWED_METRIC_LABELS[0] ?? 'service']: service.name },
          })),
      },
      {
        name: METRIC_SERVICES_TOTAL,
        help: 'How many services are checked.',
        type: 'gauge',
        samples: [{ value: summary.total }],
      },
      {
        name: METRIC_SERVICES_UP,
        help: 'How many of them answered.',
        type: 'gauge',
        samples: [{ value: summary.up }],
      },
      {
        name: METRIC_SNAPSHOT_AGE_MS,
        help: 'Age of the cached health snapshot this scrape was served from.',
        type: 'gauge',
        samples: [{ value: Math.max(0, now - snapshot.takenAtMs) }],
      },
    ];
  }
}
