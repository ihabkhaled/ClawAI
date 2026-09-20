import { ALLOWED_METRIC_LABELS } from '../constants/metrics.constants';
import { type PrometheusMetric } from '../types/metrics.types';

/**
 * A label value, escaped for the Prometheus text format: backslash, double
 * quote and newline are the only characters that can break a line.
 */
export function escapeLabelValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

/**
 * Refuses a label the allowlist does not name (rules/19).
 *
 * A metric outlives the request that produced it and is read by anyone with
 * the dashboard, so "which service" is the only identity it may carry. This
 * throws rather than dropping the label: a metric silently missing a
 * dimension is harder to notice than a failing test.
 */
function assertLabelsAllowed(labels: Record<string, string>): void {
  for (const name of Object.keys(labels)) {
    if (!ALLOWED_METRIC_LABELS.includes(name)) {
      throw new Error(`metric label "${name}" is not allowed`);
    }
  }
}

function renderLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return '';
  }
  return `{${entries.map(([name, value]) => `${name}="${escapeLabelValue(value)}"`).join(',')}}`;
}

/**
 * The Prometheus text exposition format: a HELP line, a TYPE line, then one
 * line per sample. A non-finite value is skipped — Prometheus rejects the
 * whole scrape on a malformed line, so one unmeasurable service must not cost
 * every other metric in the response.
 */
export function renderMetrics(metrics: readonly PrometheusMetric[]): string {
  const lines: string[] = [];
  for (const metric of metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    for (const sample of metric.samples) {
      assertLabelsAllowed(sample.labels ?? {});
      if (!Number.isFinite(sample.value)) {
        continue;
      }
      lines.push(`${metric.name}${renderLabels(sample.labels ?? {})} ${String(sample.value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
