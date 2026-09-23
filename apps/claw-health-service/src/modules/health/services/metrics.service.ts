import { Injectable } from '@nestjs/common';
import { ServiceStatus } from '@claw/shared-types';

import {
  ALLOWED_METRIC_LABELS,
  METRIC_SERVICE_RESPONSE_MS,
  METRIC_SERVICE_UP,
  METRIC_SERVICES_TOTAL,
  METRIC_SERVICES_UP,
  METRIC_SNAPSHOT_AGE_MS,
} from '../constants/metrics.constants';
import { type HealthSnapshot, type PrometheusMetric } from '../types/metrics.types';
import { renderMetrics } from '../utilities/prometheus-text.utility';
import { HealthSnapshotService } from './health-snapshot.service';

/**
 * The health fan-out, as Prometheus metrics (ADR-113).
 *
 * It measures nothing of its own: it is the same check the `/health` endpoint
 * answers with, cached, so that scraping cannot turn one request into 17
 * outbound calls on every interval.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly snapshots: HealthSnapshotService) {}

  async render(now: number = Date.now()): Promise<string> {
    const snapshot = await this.snapshots.current(now);
    return renderMetrics(this.metricsFrom(snapshot, now));
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
