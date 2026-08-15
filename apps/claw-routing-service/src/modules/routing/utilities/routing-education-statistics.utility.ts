import { CONFIDENCE_INTERVAL_Z_SCORE } from '../constants/routing-education.constants';
import type { ConfidenceInterval, WeightedSample } from '../types/evaluator-attribution.types';

/**
 * Wilson score interval for a proportion — chosen over the naive normal
 * approximation because it stays inside [0, 1] and remains meaningful at the
 * small sample sizes a fresh (provider, model, taskFamily, topicKey) bucket
 * typically has, where a normal-approximation interval can be badly wrong.
 *
 * Zero samples returns the maximally uncertain interval [0, 1] — there is no
 * evidence yet, so no interval narrower than "could be anything" is honest.
 */
export function computeWilsonScoreInterval(
  successRate: number,
  sampleSize: number,
  zScore: number = CONFIDENCE_INTERVAL_Z_SCORE,
): ConfidenceInterval {
  if (sampleSize <= 0) {
    return { lowerBound: 0, upperBound: 1 };
  }

  const proportion = Math.min(1, Math.max(0, successRate));
  const zSquared = zScore * zScore;
  const denominator = 1 + zSquared / sampleSize;
  const centre = proportion + zSquared / (2 * sampleSize);
  const margin =
    zScore *
    Math.sqrt(
      (proportion * (1 - proportion)) / sampleSize + zSquared / (4 * sampleSize * sampleSize),
    );

  return {
    lowerBound: Math.max(0, (centre - margin) / denominator),
    upperBound: Math.min(1, (centre + margin) / denominator),
  };
}

/**
 * Weighted average with outlier control (winsorization to a fixed domain
 * ceiling — see MAX_LATENCY_OUTLIER_MS / MAX_COST_OUTLIER_ESTIMATE for why a
 * statistical (e.g. median-deviation) approach was rejected: it cannot
 * distinguish an outlier from ordinary spread until there are enough samples
 * to establish spread, and a thin bucket — exactly where one bad observation
 * does the most damage — is the common case here. Every sample is clamped to
 * [floor, ceiling] before being weighted; none are dropped, so every
 * observation still counts toward the sample size and the average, just not
 * at its raw, possibly-anomalous value.
 */
export function computeWinsorizedWeightedAverage(
  samples: WeightedSample[],
  ceiling: number,
  floor = 0,
): number {
  if (samples.length === 0) {
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const sample of samples) {
    const clamped = Math.min(ceiling, Math.max(floor, sample.value));
    weightedSum += clamped * sample.weight;
    totalWeight += sample.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
