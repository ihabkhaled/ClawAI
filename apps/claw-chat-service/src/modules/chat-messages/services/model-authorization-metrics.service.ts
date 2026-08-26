import { Injectable } from '@nestjs/common';

import { MODEL_AUTHORIZATION_LATENCY_WINDOW } from '../constants/model-authorization-metrics.constants';
import { ModelAuthorizationDenialReason } from '../enums/model-authorization-denial-reason.enum';
import type {
  ModelAuthorizationLatencySnapshot,
  ModelAuthorizationMetricsSnapshot,
} from '../types/model-authorization-metrics.types';

/**
 * Counters for the model-authorization decisions this service makes: how many
 * requests were allowed, how many were refused and for which reason, and how
 * long deciding took.
 *
 * Why this exists: the gate fails closed and calls another service to decide.
 * Both properties are invisible without measurement. A connector-service
 * outage turns every request into an EXPOSURE denial, which looks identical to
 * "we unexposed a popular model" in the logs but is a very different incident;
 * and a slow exposure check adds latency to every message sent.
 *
 * Why the state is static: the two deny sites construct their collaborators
 * directly rather than through DI, and a per-instance counter would report
 * whichever half of the gate the reader happened to reach. Process-wide is the
 * only scope that matches what is being measured.
 *
 * Why in-memory: a restart resetting the window is wanted, not tolerated —
 * post-deploy comparison is the most informative read. Durable history is
 * already covered by the structured audit log.
 */
@Injectable()
export class ModelAuthorizationMetricsService {
  private static startedAt = new Date();
  private static allowed = 0;
  private static readonly denials = new Map<ModelAuthorizationDenialReason, number>();
  private static readonly latencies: number[] = [];

  recordAllowed(elapsedMs: number): void {
    ModelAuthorizationMetricsService.allowed += 1;
    ModelAuthorizationMetricsService.recordLatency(elapsedMs);
  }

  recordDenied(reason: ModelAuthorizationDenialReason, elapsedMs: number): void {
    const previous = ModelAuthorizationMetricsService.denials.get(reason) ?? 0;
    ModelAuthorizationMetricsService.denials.set(reason, previous + 1);
    ModelAuthorizationMetricsService.recordLatency(elapsedMs);
  }

  snapshot(): ModelAuthorizationMetricsSnapshot {
    const denialsByReason = Object.values(ModelAuthorizationDenialReason).reduce<
      Record<ModelAuthorizationDenialReason, number>
    >(
      (acc, reason) => {
        acc[reason] = ModelAuthorizationMetricsService.denials.get(reason) ?? 0;
        return acc;
      },
      {
        [ModelAuthorizationDenialReason.PLAN]: 0,
        [ModelAuthorizationDenialReason.EXPOSURE]: 0,
        [ModelAuthorizationDenialReason.EXECUTION_EXPOSURE]: 0,
      },
    );
    const denied = Object.values(denialsByReason).reduce((sum, count) => sum + count, 0);
    return {
      startedAt: ModelAuthorizationMetricsService.startedAt.toISOString(),
      allowed: ModelAuthorizationMetricsService.allowed,
      denied,
      denialsByReason,
      latency: ModelAuthorizationMetricsService.latencySnapshot(),
    };
  }

  // Test helper — the counters are process-wide, so a suite that asserts on
  // them has to start from a known window.
  reset(): void {
    ModelAuthorizationMetricsService.allowed = 0;
    ModelAuthorizationMetricsService.denials.clear();
    ModelAuthorizationMetricsService.latencies.length = 0;
    ModelAuthorizationMetricsService.startedAt = new Date();
  }

  private static recordLatency(elapsedMs: number): void {
    ModelAuthorizationMetricsService.latencies.push(Math.max(0, Math.round(elapsedMs)));
    if (ModelAuthorizationMetricsService.latencies.length > MODEL_AUTHORIZATION_LATENCY_WINDOW) {
      ModelAuthorizationMetricsService.latencies.shift();
    }
  }

  private static latencySnapshot(): ModelAuthorizationLatencySnapshot {
    const samples = [...ModelAuthorizationMetricsService.latencies].sort((a, b) => a - b);
    if (samples.length === 0) {
      return { samples: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 };
    }
    return {
      samples: samples.length,
      p50Ms: ModelAuthorizationMetricsService.percentile(samples, 0.5),
      p95Ms: ModelAuthorizationMetricsService.percentile(samples, 0.95),
      maxMs: samples.at(-1) ?? 0,
    };
  }

  private static percentile(sorted: number[], fraction: number): number {
    const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
    return sorted[index] ?? 0;
  }
}
