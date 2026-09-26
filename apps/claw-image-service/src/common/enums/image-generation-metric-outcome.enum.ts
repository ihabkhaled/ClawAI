/**
 * How one generation ATTEMPT ended, as the metrics count it (pack §67). An
 * AUTO attempt that failed and handed the job to a successor row is
 * SUPERSEDED, not FAILED: the user may still get an image.
 */
export enum ImageGenerationMetricOutcome {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SUPERSEDED = 'SUPERSEDED',
}
