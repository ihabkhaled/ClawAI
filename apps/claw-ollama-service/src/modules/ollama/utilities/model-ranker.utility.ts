import {
  RANK_PENALTY_SIZE_THRESHOLD_BYTES,
  RANK_SCORE_CAPABILITY_WEIGHT,
  RANK_SCORE_FAMILY_BONUS,
  RANK_SCORE_SIZE_PENALTY,
  RANK_SCORE_SIZE_SWEETSPOT_BONUS,
  RANK_SIZE_SWEETSPOT_MAX_BYTES,
  RANK_SIZE_SWEETSPOT_MIN_BYTES,
} from '../constants/discovery.constants';
import { FAMILY_TAXONOMY } from '../constants/model-family-taxonomy.constants';
import type { RankableModel } from '../types/discovery.types';

const KNOWN_FAMILIES = new Set(FAMILY_TAXONOMY.map((entry) => entry.family));

function scoreModel(model: RankableModel): number {
  let score = 0;

  if (model.familyName !== null && KNOWN_FAMILIES.has(model.familyName)) {
    score += RANK_SCORE_FAMILY_BONUS;
  }

  score += model.capabilities.length * RANK_SCORE_CAPABILITY_WEIGHT;

  if (model.sizeBytes !== null && model.sizeBytes > 0n) {
    if (model.sizeBytes > RANK_PENALTY_SIZE_THRESHOLD_BYTES) {
      score -= RANK_SCORE_SIZE_PENALTY;
    } else if (
      model.sizeBytes >= RANK_SIZE_SWEETSPOT_MIN_BYTES &&
      model.sizeBytes <= RANK_SIZE_SWEETSPOT_MAX_BYTES
    ) {
      score += RANK_SCORE_SIZE_SWEETSPOT_BONUS;
    }
  }

  return score;
}

export function rankDiscoveredModels<T extends RankableModel>(models: T[]): T[] {
  if (models.length === 0) return [];
  return [...models].sort((a, b) => scoreModel(b) - scoreModel(a));
}
