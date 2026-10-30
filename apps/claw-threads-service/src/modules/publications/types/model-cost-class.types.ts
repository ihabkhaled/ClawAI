import type { ModelCostClass } from '@claw/shared-types';

/**
 * Cost class per model, keyed by `costClassKey`. A key that is absent was never answered (the
 * lookup failed); `null` was answered as "no price". Either way the plan helper gets no class and
 * refuses the model, which is the safe side.
 */
export type CostClassIndex = ReadonlyMap<string, ModelCostClass | null>;
