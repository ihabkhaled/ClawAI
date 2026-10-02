import type { ModelCostClass } from '@claw/shared-types';

import type { EligibleDeploymentRecord } from './model-deployment.types';
import type { FallbackEntry } from './routing.types';

/**
 * A model chat-service may answer with when the model the user PICKED fails
 * (MANUAL_MODEL smart fallback). Every entry already passed exposure, connector
 * health, the user's plan and the image-output filter (rule 51 item 1);
 * chat-service still reserves credit per hop, so a substitute the wallet cannot
 * pay for is refused there.
 *
 * `costlier` is true when the substitute's cost class is above the pick's: the
 * bubble must say so, a pricier model is never used silently.
 */
export interface PickedModelSubstitute {
  provider: string;
  model: string;
  sameProvider: boolean;
  costlier: boolean;
}

/** One substitute with the keys it is sorted by. */
export interface ScoredPickedModelSubstitute {
  substitute: PickedModelSubstitute;
  group: number;
  distance: number;
  order: number;
}

/** Inputs of the pure substitute ranking. */
export interface PickedModelSubstituteRankingInput {
  pick: FallbackEntry;
  eligible: readonly EligibleDeploymentRecord[];
  costClassOf: (provider: string, model: string) => ModelCostClass | undefined;
  limit: number;
}
