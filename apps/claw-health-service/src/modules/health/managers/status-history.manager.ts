import { Injectable } from '@nestjs/common';

import { PrometheusAdapter } from '../adapters/prometheus.adapter';
import {
  PROMQL_BUCKETS_WITH_DATA,
  PROMQL_FAILING_BUCKETS,
  STATUS_BUCKET_SECONDS,
  UPTIME_WINDOW_SECONDS,
} from '../constants/status-page.constants';
import { UptimeWindow } from '../enums/uptime-window.enum';
import { type StatusHistory } from '../types/status-page.types';
import { buildHistory } from '../utilities/status-aggregation.utility';

/**
 * The status page's history, read from Prometheus.
 *
 * Two range queries over the whole retention window at a 5-minute step: which
 * buckets were measured at all, and which buckets each service failed a check
 * in. The shorter windows and the incident list are suffixes of the same data,
 * so no window costs a query of its own.
 */
@Injectable()
export class StatusHistoryManager {
  constructor(private readonly prometheus: PrometheusAdapter) {}

  async read(nowMs: number): Promise<StatusHistory> {
    const step = STATUS_BUCKET_SECONDS;
    // Aligned to the step, so the same buckets come back on every read.
    const endSeconds = Math.floor(Math.floor(nowMs / 1000) / step) * step;
    const startSeconds = endSeconds - UPTIME_WINDOW_SECONDS[UptimeWindow.MONTH] + step;

    const [measured, failing] = await Promise.all([
      this.prometheus.queryRange(PROMQL_BUCKETS_WITH_DATA, startSeconds, endSeconds, step),
      this.prometheus.queryRange(PROMQL_FAILING_BUCKETS, startSeconds, endSeconds, step),
    ]);

    const failingByService = new Map<string, Set<number>>();
    for (const series of failing) {
      const service = series.labels['service'];
      if (service !== undefined) {
        failingByService.set(service, new Set(series.timestamps));
      }
    }

    return buildHistory({
      bucketsWithData: measured.flatMap((series) => series.timestamps),
      failingByService,
      endSeconds,
      bucketSeconds: step,
    });
  }
}
