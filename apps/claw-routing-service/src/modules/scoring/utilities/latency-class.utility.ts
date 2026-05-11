import { type LatencyClass } from '../../../generated/prisma';
import { LATENCY_CLASS_P95_THRESHOLDS_MS } from '../constants/scoring.constants';

/// Maps a p95 latency in milliseconds to a LatencyClass.
export function latencyClassFromP95Ms(p95Ms: number | null): LatencyClass | null {
  if (p95Ms === null) return null;
  if (p95Ms < 0) return null;
  for (const threshold of LATENCY_CLASS_P95_THRESHOLDS_MS) {
    if (p95Ms <= threshold.max) return threshold.class;
  }
  return null;
}
