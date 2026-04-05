import { CONFIDENCE_THRESHOLDS } from '@/constants';

/**
 * Get a human-readable label for a confidence score.
 */
export function getConfidenceLabel(confidence: number | null): string {
  if (confidence === null) {
    return 'N/A';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'High';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Get a Tailwind CSS class for a confidence score color.
 */
export function getConfidenceClass(confidence: number | null): string {
  if (confidence === null) {
    return 'text-muted-foreground';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'text-emerald-600';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'text-amber-600';
  }
  return 'text-destructive';
}
