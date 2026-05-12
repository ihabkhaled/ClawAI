import { Logger } from '@nestjs/common';
import { type RoutingMode } from '../../../generated/prisma';
import { DEFAULT_POLICY_WEIGHTS, WEIGHTS_SUM_TOLERANCE } from '../constants/scoring.constants';
import { type DimensionWeights, SCORE_DIMENSIONS } from '../types/scoring.types';
import { sumsToOne } from './normalize.utility';

const logger = new Logger('PolicyWeightsResolver');

/// Reads a custom weights vector from a routing policy's config.weightsJson
/// (Phase 4 — admin-editable weights). Falls back to the per-mode default
/// when the policy has no override or the override is malformed.
export function resolvePolicyWeights(
  mode: RoutingMode,
  policyConfig?: Record<string, unknown> | null,
): DimensionWeights {
  if (policyConfig === null || policyConfig === undefined) {
    return DEFAULT_POLICY_WEIGHTS[mode];
  }
  const override = policyConfig['weightsJson'];
  if (override === null || override === undefined || typeof override !== 'object') {
    return DEFAULT_POLICY_WEIGHTS[mode];
  }
  const overrideMap = override as Record<string, unknown>;
  const candidate: Partial<Record<string, number>> = {};
  for (const dim of SCORE_DIMENSIONS) {
    const v = overrideMap[dim];
    if (typeof v !== 'number') {
      logger.warn(
        `policy weights missing dimension="${dim}" — falling back to default for mode=${mode}`,
      );
      return DEFAULT_POLICY_WEIGHTS[mode];
    }
    candidate[dim] = v;
  }
  const values = SCORE_DIMENSIONS.map((d) => candidate[d] ?? 0);
  if (!sumsToOne(values, WEIGHTS_SUM_TOLERANCE)) {
    logger.warn(`policy weightsJson does not sum to 1.0 (mode=${mode}) — falling back to default`);
    return DEFAULT_POLICY_WEIGHTS[mode];
  }
  return candidate as DimensionWeights;
}
