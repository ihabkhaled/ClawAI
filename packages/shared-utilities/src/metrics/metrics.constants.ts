/** Prometheus metric and label names: lower snake case, never starting with a digit. */
export const METRIC_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;

/** `le` is the histogram bucket label; a metric may not declare it itself. */
export const METRIC_RESERVED_LABEL_NAMES: readonly string[] = ['le'];

/**
 * Where any label value outside a metric's declared set lands. Cardinality is
 * bounded by construction: a user id, a file id or a free-text model name
 * handed to a label can never become a new series, only `other` (rules/19).
 */
export const METRIC_OTHER_LABEL_VALUE = 'other';

/**
 * Default duration buckets, in seconds: sub-second API work up to the
 * ten-minute media jobs (a long video's transcription, a slow image render).
 */
export const METRIC_DEFAULT_DURATION_BUCKETS_SECONDS: readonly number[] = [
  0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600,
];

/** Joins a series' label values into its map key; a NUL cannot occur in a declared value. */
export const METRIC_SERIES_KEY_SEPARATOR = '\u0000';

/** The content type Prometheus expects from a text-format scrape. */
export const PROMETHEUS_TEXT_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';
