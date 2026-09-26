import { MetricType } from './metric-type.enum';
import {
  assertAscendingBuckets,
  assertMetricName,
  formatBucketBound,
  normalizeLabelSpec,
  renderMetricLabels,
  resolveLabelValues,
  seriesKey,
} from './metric-labels.utility';
import type {
  CounterDefinition,
  CounterSeries,
  HistogramDefinition,
  HistogramSeries,
  MetricCounter,
  MetricHistogram,
  MetricLabels,
  RegisteredCounter,
  RegisteredHistogram,
} from './metrics.types';

/**
 * A process-local Prometheus registry with no dependency (ADR-113 addendum
 * "media metrics"). Counters and histograms only, rendered in the text
 * exposition format a scrape reads.
 *
 * Every label declares the values it may take, and anything else is recorded
 * as `other`: the series count is fixed at declaration, so no request can add
 * a user id, a file id or a free-text model name to a store kept for 30 days
 * (rules/19). Recording never throws — a metric must not fail the request it
 * measures; declaring a bad metric throws at boot, where it is seen.
 *
 * Per process: a scaled service (chat-service runs 4 replicas) exposes one
 * registry per replica, and PromQL sums them.
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, RegisteredCounter>();
  private readonly histograms = new Map<string, RegisteredHistogram>();
  private readonly order: string[] = [];

  counter(definition: CounterDefinition): MetricCounter {
    this.assertFree(definition.name, this.histograms);
    const metric = this.counters.get(definition.name) ?? this.declareCounter(definition);
    return {
      inc: (labels: MetricLabels, by = 1): void => {
        if (!Number.isFinite(by) || by < 0) {
          return;
        }
        const labelValues = resolveLabelValues(metric.spec, labels);
        const key = seriesKey(labelValues);
        const series: CounterSeries = metric.series.get(key) ?? { labelValues, value: 0 };
        series.value += by;
        metric.series.set(key, series);
      },
    };
  }

  histogram(definition: HistogramDefinition): MetricHistogram {
    this.assertFree(definition.name, this.counters);
    const metric = this.histograms.get(definition.name) ?? this.declareHistogram(definition);
    const { buckets } = metric.definition;
    return {
      observe: (labels: MetricLabels, value: number): void => {
        if (!Number.isFinite(value) || value < 0) {
          return;
        }
        const labelValues = resolveLabelValues(metric.spec, labels);
        const key = seriesKey(labelValues);
        const series: HistogramSeries = metric.series.get(key) ?? {
          labelValues,
          bucketCounts: buckets.map(() => 0),
          sum: 0,
          count: 0,
        };
        const index = buckets.findIndex((bound) => value <= bound);
        if (index >= 0) {
          series.bucketCounts.splice(index, 1, (series.bucketCounts.at(index) ?? 0) + 1);
        }
        series.sum += value;
        series.count += 1;
        metric.series.set(key, series);
      },
    };
  }

  /** The Prometheus text format: HELP, TYPE, then every series in a stable order. */
  render(): string {
    const lines: string[] = [];
    for (const name of this.order) {
      const counter = this.counters.get(name);
      if (counter !== undefined) {
        this.renderCounter(counter, lines);
      }
      const histogram = this.histograms.get(name);
      if (histogram !== undefined) {
        this.renderHistogram(histogram, lines);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  /** Clears every recorded sample; declarations stay. For tests. */
  reset(): void {
    for (const metric of this.counters.values()) {
      metric.series.clear();
    }
    for (const metric of this.histograms.values()) {
      metric.series.clear();
    }
  }

  private declareCounter(definition: CounterDefinition): RegisteredCounter {
    assertMetricName(definition.name, 'metric');
    const metric: RegisteredCounter = {
      definition,
      spec: normalizeLabelSpec(definition.labels),
      series: new Map<string, CounterSeries>(),
    };
    this.counters.set(definition.name, metric);
    this.order.push(definition.name);
    return metric;
  }

  private declareHistogram(definition: HistogramDefinition): RegisteredHistogram {
    assertMetricName(definition.name, 'metric');
    assertAscendingBuckets(definition.name, definition.buckets);
    const metric: RegisteredHistogram = {
      definition: { ...definition, buckets: [...definition.buckets] },
      spec: normalizeLabelSpec(definition.labels),
      series: new Map<string, HistogramSeries>(),
    };
    this.histograms.set(definition.name, metric);
    this.order.push(definition.name);
    return metric;
  }

  /** One name, one kind: a counter and a histogram may not share a name. */
  private assertFree(name: string, otherKind: ReadonlyMap<string, unknown>): void {
    if (otherKind.has(name)) {
      throw new Error(`metric "${name}" is already declared as another type`);
    }
  }

  private renderHeader(definition: CounterDefinition, type: MetricType, lines: string[]): void {
    lines.push(`# HELP ${definition.name} ${definition.help.replaceAll('\n', ' ')}`);
    lines.push(`# TYPE ${definition.name} ${type}`);
  }

  private renderCounter(metric: RegisteredCounter, lines: string[]): void {
    const { name } = metric.definition;
    this.renderHeader(metric.definition, MetricType.COUNTER, lines);
    for (const series of this.sorted(metric.series)) {
      const labels = renderMetricLabels(metric.spec.names, series.labelValues);
      lines.push(`${name}${labels} ${String(series.value)}`);
    }
  }

  private renderHistogram(metric: RegisteredHistogram, lines: string[]): void {
    const { name, buckets } = metric.definition;
    this.renderHeader(metric.definition, MetricType.HISTOGRAM, lines);
    for (const series of this.sorted(metric.series)) {
      let cumulative = 0;
      for (const [index, bound] of buckets.entries()) {
        cumulative += series.bucketCounts.at(index) ?? 0;
        const labels = renderMetricLabels(metric.spec.names, series.labelValues, [
          ['le', formatBucketBound(bound)],
        ]);
        lines.push(`${name}_bucket${labels} ${String(cumulative)}`);
      }
      const infinity = renderMetricLabels(metric.spec.names, series.labelValues, [
        ['le', formatBucketBound(Number.POSITIVE_INFINITY)],
      ]);
      lines.push(`${name}_bucket${infinity} ${String(series.count)}`);
      const labels = renderMetricLabels(metric.spec.names, series.labelValues);
      lines.push(`${name}_sum${labels} ${String(series.sum)}`);
      lines.push(`${name}_count${labels} ${String(series.count)}`);
    }
  }

  private sorted<T>(series: ReadonlyMap<string, T>): T[] {
    return [...series.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value);
  }
}
