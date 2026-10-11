import { Injectable, Logger } from '@nestjs/common';
import { MS_PER_HOUR, SYNC_NOISE_REGEX, UNKNOWN_LABEL } from '../constants/observability.constants';
import { FailureCountBy } from '@common/enums';
import { ObservabilityRepository } from '../repositories/observability.repository';
import type {
  CountDoc,
  CountEntry,
  FailureGroup,
  FailuresQuery,
  FailuresResponse,
  FailuresWindow,
  TracingQuery,
  TracingResponse,
  TracingRow,
} from '../types/observability.types';
import { normalizeProviderKey, providerLabel } from '../utilities/provider-label.utility';

/**
 * Observability aggregates over the audit store, always bounded to a recent
 * window (default 24h, at most 30 days): the old all-time counts dominated by
 * workspace-sync noise are gone. SYNC_* events are counted and labelled
 * separately, never silently dropped.
 */
@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(private readonly repository: ObservabilityRepository) {}

  async getFailures(query: FailuresQuery): Promise<FailuresResponse> {
    const window = this.window(query.hours);
    this.logger.debug(
      `getFailures: hours=${String(query.hours)} includeSync=${String(query.includeSync)}`,
    );
    const facet = await this.repository.failures(window, query);

    const totals = { failures: 0, syncNoise: 0 };
    for (const entry of facet?.totals ?? []) {
      if (entry._id) {
        totals.syncNoise = entry.count;
      } else {
        totals.failures = entry.count;
      }
    }
    const total = facet?.groupsTotal[0]?.total ?? 0;
    const items: FailureGroup[] = (facet?.groups ?? []).map((doc) => ({
      action: doc._id.action,
      source: doc._id.entityType ?? 'unknown',
      severity: doc._id.severity,
      isSyncNoise: SYNC_NOISE_REGEX.test(doc._id.action),
      count: doc.count,
      lastSeenAt: doc.lastSeenAt.toISOString(),
    }));

    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      hours: query.hours,
      includeSync: query.includeSync,
      totals,
      groups: {
        items,
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      bySource: (facet?.bySource ?? []).map((doc) => this.entry(doc, (key) => key)),
      topProviders: this.mergeProviders(facet?.providers ?? []),
      topModels: (facet?.models ?? []).map((doc) => this.entry(doc, (key) => key)),
    };
  }

  async getTracing(query: TracingQuery): Promise<TracingResponse> {
    const window = this.window(query.hours);
    this.logger.debug(`getTracing: hours=${String(query.hours)} dimension=${query.dimension}`);
    const [facet, overall, signals, failureCounts] = await Promise.all([
      this.repository.tracing(window, query),
      this.repository.tracingOverall(window, query),
      this.repository.signals(window),
      query.dimension === 'context'
        ? Promise.resolve<CountDoc[]>([])
        : this.repository.failureCounts(
            window,
            query.dimension === 'provider' ? FailureCountBy.PROVIDER : FailureCountBy.MODEL,
          ),
    ]);
    const failures = new Map<string, number>(
      failureCounts.map((doc) => [doc._id ?? UNKNOWN_LABEL, doc.count]),
    );
    const total = facet?.total[0]?.total ?? 0;
    const items = (facet?.rows ?? []).map((doc): TracingRow => {
      const failureEvents =
        query.dimension === 'context'
          ? null
          : (failures.get(query.dimension === 'provider' ? doc._id : (doc.model ?? '')) ?? 0);
      return {
        key: doc._id,
        label: this.rowLabel(query, doc._id, doc.provider, doc.model),
        provider: query.dimension === 'context' ? null : normalizeProviderKey(doc.provider),
        model: query.dimension === 'model' ? (doc.model ?? UNKNOWN_LABEL) : null,
        requests: doc.requests,
        measuredRequests: doc.measured,
        avgLatencyMs: this.round(doc.avgLatency),
        p50LatencyMs: this.round(doc.percentiles?.[0]),
        p95LatencyMs: this.round(doc.percentiles?.[1]),
        totalTokens: doc.totalTokens,
        providerReportedRequests: doc.requests - doc.estimatedRequests,
        estimatedRequests: doc.estimatedRequests,
        failureEvents,
        errorRate:
          failureEvents === null || doc.requests + failureEvents === 0
            ? null
            : Math.round((failureEvents / (doc.requests + failureEvents)) * 10_000) / 10_000,
      };
    });

    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      hours: query.hours,
      dimension: query.dimension,
      overall: {
        requests: overall?.requests ?? 0,
        measuredRequests: overall?.measured ?? 0,
        p50LatencyMs: this.round(overall?.percentiles?.[0]),
        p95LatencyMs: this.round(overall?.percentiles?.[1]),
      },
      rows: {
        items,
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      signals: signals.map((doc) => ({ action: doc._id ?? UNKNOWN_LABEL, count: doc.count })),
    };
  }

  private window(hours: number): FailuresWindow {
    const to = new Date();
    return { from: new Date(to.getTime() - hours * MS_PER_HOUR), to, hours };
  }

  private round(value: number | null | undefined): number | null {
    return value === null || value === undefined ? null : Math.round(value);
  }

  private entry(doc: CountDoc, label: (key: string) => string): CountEntry {
    const key = doc._id ?? UNKNOWN_LABEL;
    return { key, label: label(key), count: doc.count };
  }

  /** The pipeline already folds common separators; this merges any leftovers and applies display labels. */
  private mergeProviders(docs: CountDoc[]): CountEntry[] {
    const merged = new Map<string, number>();
    for (const doc of docs) {
      const key = normalizeProviderKey(doc._id);
      merged.set(key, (merged.get(key) ?? 0) + doc.count);
    }
    return [...merged.entries()]
      .map(([key, count]) => ({ key, label: providerLabel(key), count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }

  private rowLabel(
    query: TracingQuery,
    key: string,
    provider: string | null,
    model: string | null,
  ): string {
    switch (query.dimension) {
      case 'provider':
        return providerLabel(provider ?? key);
      case 'model':
        return `${model ?? UNKNOWN_LABEL} (${providerLabel(provider)})`;
      case 'context':
        return key;
    }
  }
}
