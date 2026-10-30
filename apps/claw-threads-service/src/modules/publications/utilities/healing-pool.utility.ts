import {
  isModelAllowedForUsage,
  ModelUsageType,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import type { ThreadHealingCandidate, ThreadHealingPool } from '@claw/shared-types';

import {
  HEALING_POOL_MAX,
  HEALING_SAFE_DEFAULT_MODEL_PATTERN,
  HEALING_SAFE_DEFAULT_PROVIDER,
} from '../constants/healing-pool.constants';
import {
  THREAD_ASSUMED_WINDOW_TOKENS,
  USAGE_TIER_RANK,
} from '../constants/recommended-team.constants';
import type { CostClassIndex } from '../types/model-cost-class.types';
import { type CatalogModel, ThreadModelAvailability } from '../types/recommended-team.types';
import { costClassOf, NO_COST_CLASSES } from './model-cost-class.utility';
import { classifyModel } from './recommended-team.utility';

function costRank(model: CatalogModel): number {
  return USAGE_TIER_RANK.get(model.usageTier ?? '') ?? USAGE_TIER_RANK.size;
}

function toCandidate(model: CatalogModel): ThreadHealingCandidate {
  return {
    provider: model.provider,
    model: model.model,
    windowTokens: model.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS,
    costRank: costRank(model),
  };
}

/**
 * The models a job may heal with once a seat's own backups are spent (ADR-181): every catalog
 * model the caller's plan allows as a fallback, that the team recommendation also accepts (not on
 * the deny list, window large enough), cheapest cost band first and spread over providers so one
 * provider's outage does not fill the list. The safe default is a cheap, large-window Gemini
 * "flash" model when the plan has one. No usable model -> undefined (the job then has only the
 * seats' own backups, which is exactly the old behaviour).
 */
export function buildHealingPool(
  entitlements: UserEntitlements,
  catalog: readonly CatalogModel[],
  costClasses: CostClassIndex = NO_COST_CLASSES,
): ThreadHealingPool | undefined {
  const usable = catalog
    .filter(
      (model) =>
        classifyModel(entitlements, model, costClasses) === ThreadModelAvailability.AVAILABLE &&
        isModelAllowedForUsage(
          entitlements,
          model.provider,
          model.model,
          ModelUsageType.FALLBACK,
          costClassOf(costClasses, model.provider, model.model),
        ),
    )
    .sort(
      (a, b) =>
        costRank(a) - costRank(b) ||
        (b.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS) -
          (a.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS) ||
        a.provider.localeCompare(b.provider) ||
        a.model.localeCompare(b.model),
    );
  if (usable.length === 0) return undefined;
  const perProvider = new Map<string, CatalogModel[]>();
  for (const model of usable) {
    perProvider.set(model.provider, [...(perProvider.get(model.provider) ?? []), model]);
  }
  const queues = [...perProvider.values()];
  const spread: CatalogModel[] = [];
  for (let depth = 0; queues.some((queue) => queue.length > depth); depth += 1) {
    for (const queue of queues) {
      const model = queue.at(depth);
      if (model) spread.push(model);
    }
  }
  const safeDefault = usable.find(
    (model) =>
      model.provider === HEALING_SAFE_DEFAULT_PROVIDER &&
      HEALING_SAFE_DEFAULT_MODEL_PATTERN.test(model.model),
  );
  return {
    pool: spread.slice(0, HEALING_POOL_MAX).map(toCandidate),
    ...(safeDefault ? { safeDefault: toCandidate(safeDefault) } : {}),
  };
}
