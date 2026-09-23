import { Injectable } from '@nestjs/common';
import { declaredHost, httpGet } from '@common/utilities';

import {
  PROMETHEUS_BASE_URL,
  PROMETHEUS_QUERY_TIMEOUT_MS,
  PROMETHEUS_RANGE_PATH,
} from '../constants/status-page.constants';
import { prometheusRangeResponseSchema } from '../schemas/prometheus-range.schema';
import { type RangeSeries } from '../types/status-page.types';

/**
 * Reads Prometheus back (ADR-113: health-service both exports the metrics and
 * reads them). One attempt, a hard timeout, no retry: the caller caches a
 * failure, so an unreachable Prometheus costs one timeout per cache period
 * rather than a retry storm.
 */
@Injectable()
export class PrometheusAdapter {
  async queryRange(
    query: string,
    startSeconds: number,
    endSeconds: number,
    stepSeconds: number,
  ): Promise<RangeSeries[]> {
    const params = new URLSearchParams({
      query,
      start: String(startSeconds),
      end: String(endSeconds),
      step: String(stepSeconds),
    });
    const url = `${PROMETHEUS_BASE_URL}${PROMETHEUS_RANGE_PATH}?${params.toString()}`;
    const body = await httpGet<unknown>(
      url,
      { timeout: PROMETHEUS_QUERY_TIMEOUT_MS },
      declaredHost(PROMETHEUS_BASE_URL),
    );
    const parsed = prometheusRangeResponseSchema.parse(body);
    return parsed.data.result.map((series) => ({
      labels: series.metric,
      timestamps: series.values.map(([timestamp]) => Math.round(timestamp)),
    }));
  }
}
