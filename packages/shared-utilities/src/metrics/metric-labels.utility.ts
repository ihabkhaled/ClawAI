import {
  METRIC_NAME_PATTERN,
  METRIC_OTHER_LABEL_VALUE,
  METRIC_RESERVED_LABEL_NAMES,
  METRIC_SERIES_KEY_SEPARATOR,
} from './metrics.constants';
import type { MetricLabels, MetricLabelValues, NormalizedLabelSpec } from './metrics.types';

/** Backslash, double quote and newline are the only characters that can break a sample line. */
export function escapeMetricLabelValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

/** Throws at declaration time for a name Prometheus would reject. */
export function assertMetricName(name: string, kind: string): void {
  if (!METRIC_NAME_PATTERN.test(name)) {
    throw new Error(`${kind} name "${name}" is not a valid Prometheus name`);
  }
}

/**
 * The declaration, validated and lower-cased once. A reserved label (`le`)
 * or a label with no allowed values (it could only ever say `other`) is
 * refused at boot, where it is seen.
 */
export function normalizeLabelSpec(labels: MetricLabelValues): NormalizedLabelSpec {
  const entries = Object.entries(labels);
  const names = entries.map(([name]) => name);
  const allowed = entries.map(([name, values]) => {
    assertMetricName(name, 'label');
    if (METRIC_RESERVED_LABEL_NAMES.includes(name)) {
      throw new Error(`label name "${name}" is reserved`);
    }
    if (values.length === 0) {
      throw new Error(`label "${name}" declares no values`);
    }
    return new Set([...values.map((value) => value.toLowerCase()), METRIC_OTHER_LABEL_VALUE]);
  });
  return { names, allowed };
}

/**
 * The values one sample is recorded under, in declared order. A value outside
 * the declared set, or a missing one, becomes `other`; keys the metric did not
 * declare are never read — an id cannot reach the output by accident.
 */
export function resolveLabelValues(spec: NormalizedLabelSpec, labels: MetricLabels): string[] {
  const provided = new Map(Object.entries(labels));
  return spec.names.map((name, index) => {
    const value = provided.get(name)?.toLowerCase();
    return value !== undefined && spec.allowed.at(index)?.has(value) === true
      ? value
      : METRIC_OTHER_LABEL_VALUE;
  });
}

/** The map key of one series. */
export function seriesKey(values: readonly string[]): string {
  return values.join(METRIC_SERIES_KEY_SEPARATOR);
}

/** `{a="x",b="y"}` for one series (plus `extra`, e.g. `le`), or `''` with no labels. */
export function renderMetricLabels(
  names: readonly string[],
  values: readonly string[],
  extra: ReadonlyArray<readonly [string, string]> = [],
): string {
  const pairs = [
    ...names.map((name, index): readonly [string, string] => [name, values.at(index) ?? '']),
    ...extra,
  ];
  return pairs.length === 0
    ? ''
    : `{${pairs.map(([name, value]) => `${name}="${escapeMetricLabelValue(value)}"`).join(',')}}`;
}

/** A bucket bound as Prometheus writes it: `0.5`, `10`, `+Inf`. */
export function formatBucketBound(bound: number): string {
  return Number.isFinite(bound) ? String(bound) : '+Inf';
}

/** Buckets must be non-empty, finite and strictly ascending. */
export function assertAscendingBuckets(name: string, buckets: readonly number[]): void {
  const ascending = buckets.every(
    (bound, index) => Number.isFinite(bound) && (index === 0 || bound > (buckets[index - 1] ?? 0)),
  );
  if (buckets.length === 0 || !ascending) {
    throw new Error(`histogram "${name}" needs finite, strictly ascending buckets`);
  }
}
