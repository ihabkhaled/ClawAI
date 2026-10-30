import type { UserEntitlements } from '@claw/shared-entitlements';
import { type ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';

import type { CostClassIndex } from '../types/model-cost-class.types';

export const NO_COST_CLASSES: CostClassIndex = new Map();

/**
 * A model id can contain "/" (`vendor/model` on an aggregator), so "provider/model" is ambiguous.
 * A JSON pair cannot collide.
 */
export function costClassKey(provider: string, model: string): string {
  return JSON.stringify([provider, model]);
}

export function costClassOf(
  index: CostClassIndex,
  provider: string,
  model: string,
): ModelCostClass | undefined {
  return index.get(costClassKey(provider, model)) ?? undefined;
}

/** Only a cost-class plan reads the class; every other plan (and an admin) never asks routing. */
export function needsCostClasses(entitlements: UserEntitlements): boolean {
  return (
    !entitlements.isAdmin && entitlements.modelAccessMode === PlanModelAccessMode.ALLOW_COST_CLASSES
  );
}
