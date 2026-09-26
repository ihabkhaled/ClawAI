/**
 * Label name → the ONLY values it may take. Anything else is recorded as
 * `other`, so a metric's series count is fixed when it is declared.
 */
export type MetricLabelValues = Readonly<Record<string, readonly string[]>>;

export type CounterDefinition = {
  name: string;
  help: string;
  labels: MetricLabelValues;
};

export type HistogramDefinition = CounterDefinition & {
  /** Upper bounds, ascending. `+Inf` is added by the renderer. */
  buckets: readonly number[];
};

/** The labels one sample is recorded under. Undeclared keys are ignored, missing ones are `other`. */
export type MetricLabels = Readonly<Record<string, string | undefined>>;

export type MetricCounter = {
  inc: (labels: MetricLabels, by?: number) => void;
};

export type MetricHistogram = {
  observe: (labels: MetricLabels, value: number) => void;
};

/** One counter series inside the registry. */
export type CounterSeries = {
  labelValues: readonly string[];
  value: number;
};

/** One histogram series: per-bucket (non-cumulative) counts, sum and count. */
export type HistogramSeries = {
  labelValues: readonly string[];
  bucketCounts: number[];
  sum: number;
  count: number;
};

/** A normalized declaration: label names in order, each with its allowed (lower-cased) values. */
export type NormalizedLabelSpec = {
  names: readonly string[];
  allowed: ReadonlyArray<ReadonlySet<string>>;
};

/** A declared counter and its series. */
export type RegisteredCounter = {
  definition: CounterDefinition;
  spec: NormalizedLabelSpec;
  series: Map<string, CounterSeries>;
};

/** A declared histogram and its series. */
export type RegisteredHistogram = {
  definition: HistogramDefinition;
  spec: NormalizedLabelSpec;
  series: Map<string, HistogramSeries>;
};
