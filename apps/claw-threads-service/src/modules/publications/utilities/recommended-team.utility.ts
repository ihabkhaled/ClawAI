import {
  isModelAllowedForUsage,
  ModelUsageType,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import {
  RECOMMENDED_AUTHOR_COUNT,
  RECOMMENDED_FALLBACKS_PER_SEAT,
  RECOMMENDED_PROVIDER_ORDER,
  THREAD_ASSUMED_WINDOW_TOKENS,
  THREAD_MIN_TEAM_WINDOW_TOKENS,
  THREAD_MODEL_DENY_LIST,
  USAGE_TIER_RANK,
} from '../constants/recommended-team.constants';
import type { ModelRef } from '../types/generation-preflight.types';
import { healthRank, isDegraded, recentHealthOf } from './model-health.utility';
import {
  type CatalogModel,
  type ExcludedModel,
  type ModelHealthIndex,
  type RecommendedModelStatus,
  type RecommendedSeat,
  type RecommendedTeam,
  ThreadModelAvailability,
} from '../types/recommended-team.types';

function isDenied({ provider, model }: ModelRef): boolean {
  return THREAD_MODEL_DENY_LIST.some(
    (entry) => entry.provider === provider && (entry.model === undefined || entry.model === model),
  );
}

/**
 * Whether the caller can use a catalog model as a primary. The plan test is the one the
 * preflight runs on a start (`isModelAllowedForUsage`, PRIMARY), so a model marked available here
 * is not refused there. A model without a published window uses the documented assumed window.
 */
export function classifyModel(
  entitlements: UserEntitlements,
  model: CatalogModel,
): ThreadModelAvailability {
  if (isDenied(model)) return ThreadModelAvailability.UNAVAILABLE;
  if (!isModelAllowedForUsage(entitlements, model.provider, model.model, ModelUsageType.PRIMARY)) {
    return ThreadModelAvailability.NEEDS_PLAN;
  }
  const window = model.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS;
  return window < THREAD_MIN_TEAM_WINDOW_TOKENS
    ? ThreadModelAvailability.WINDOW_TOO_SMALL
    : ThreadModelAvailability.AVAILABLE;
}

const NO_HEALTH: ModelHealthIndex = new Map();

function providerRank(provider: string): number {
  const index = RECOMMENDED_PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? RECOMMENDED_PROVIDER_ORDER.length : index;
}

function tierRank({ usageTier }: CatalogModel): number {
  return USAGE_TIER_RANK.get(usageTier ?? '') ?? Number.MAX_SAFE_INTEGER;
}

function compareModels(
  a: CatalogModel,
  b: CatalogModel,
  health: ModelHealthIndex = NO_HEALTH,
): number {
  return (
    healthRank(health, b) - healthRank(health, a) ||
    providerRank(a.provider) - providerRank(b.provider) ||
    a.provider.localeCompare(b.provider) ||
    tierRank(a) - tierRank(b) ||
    (b.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS) -
      (a.windowTokens ?? THREAD_ASSUMED_WINDOW_TOKENS) ||
    a.model.localeCompare(b.model)
  );
}

/** Best model of each provider first (provider order), then the runners-up in the same order. */
function spreadAcrossProviders(sorted: readonly CatalogModel[]): CatalogModel[] {
  const byProvider = new Map<string, CatalogModel[]>();
  for (const model of sorted) {
    byProvider.set(model.provider, [...(byProvider.get(model.provider) ?? []), model]);
  }
  const queues = [...byProvider.values()];
  const spread: CatalogModel[] = [];
  for (let depth = 0; queues.some((queue) => queue.length > depth); depth += 1) {
    for (const queue of queues) {
      const model = queue.at(depth);
      if (model) spread.push(model);
    }
  }
  return spread;
}

function toRef({ provider, model }: ModelRef): ModelRef {
  return { provider, model };
}

function fallbacksFor(
  entitlements: UserEntitlements,
  seat: CatalogModel,
  ranked: readonly CatalogModel[],
): ModelRef[] {
  return ranked
    .filter(
      (candidate) =>
        candidate.provider !== seat.provider &&
        isModelAllowedForUsage(
          entitlements,
          candidate.provider,
          candidate.model,
          ModelUsageType.FALLBACK,
        ),
    )
    .slice(0, RECOMMENDED_FALLBACKS_PER_SEAT)
    .map(toRef);
}

/** One row per catalog model: usable, or the single reason it is not. */
export function classifyCatalog(
  entitlements: UserEntitlements,
  catalog: readonly CatalogModel[],
  health: ModelHealthIndex = NO_HEALTH,
): RecommendedModelStatus[] {
  return catalog.map((model) => {
    const status = classifyModelWithHealth(entitlements, model, health);
    const recent = recentHealthOf(health, model);
    return {
      ...toRef(model),
      status,
      ...(status === ThreadModelAvailability.DEGRADED && recent ? { recentHealth: recent } : {}),
    };
  });
}

/** `classifyModel`, then a usable model that mostly failed in the last hour becomes DEGRADED. */
export function classifyModelWithHealth(
  entitlements: UserEntitlements,
  model: CatalogModel,
  health: ModelHealthIndex,
): ThreadModelAvailability {
  const status = classifyModel(entitlements, model);
  return status === ThreadModelAvailability.AVAILABLE && isDegraded(health, model)
    ? ThreadModelAvailability.DEGRADED
    : status;
}

/** The catalog models that cannot be used, each with why. */
export function listExcludedModels(
  entitlements: UserEntitlements,
  catalog: readonly CatalogModel[],
): ExcludedModel[] {
  return catalog.flatMap((model): ExcludedModel[] => {
    const status = classifyModel(entitlements, model);
    // A degraded model is still usable (the health demotion lives in `classifyCatalog`).
    return status === ThreadModelAvailability.AVAILABLE ||
      status === ThreadModelAvailability.DEGRADED
      ? []
      : [{ ...toRef(model), reasonIfExcluded: status }];
  });
}

/**
 * Three authors, a Judge and a Critic taken from the usable models, healthiest first (last hour's
 * success rate, ADR-183), spread over as many providers as exist (one provider's outage cannot
 * stop every seat), cheapest band first within a provider.
 * With fewer usable models than seats the list repeats. Each seat gets backups on other
 * providers that the plan allows as fallbacks. No usable model -> null.
 */
export function buildRecommendedTeam(
  entitlements: UserEntitlements,
  catalog: readonly CatalogModel[],
  health: ModelHealthIndex = NO_HEALTH,
): RecommendedTeam | null {
  const usableByPlan = catalog.filter(
    (model) => classifyModel(entitlements, model) === ThreadModelAvailability.AVAILABLE,
  );
  // Healthy models first; a degraded one is only used when nothing healthy is left.
  const healthy = usableByPlan.filter((model) => !isDegraded(health, model));
  const usable = (healthy.length > 0 ? healthy : usableByPlan).sort((a, b) =>
    compareModels(a, b, health),
  );
  if (usable.length === 0) return null;
  const spread = spreadAcrossProviders(usable);
  const seat = (index: number): RecommendedSeat => {
    const chosen = spread[index % spread.length] ?? usable[0];
    if (!chosen) throw new Error('unreachable: usable is not empty');
    return { ...toRef(chosen), fallbacks: fallbacksFor(entitlements, chosen, spread) };
  };
  return {
    authors: Array.from({ length: RECOMMENDED_AUTHOR_COUNT }, (_, index) => seat(index)),
    judge: seat(RECOMMENDED_AUTHOR_COUNT),
    critic: seat(RECOMMENDED_AUTHOR_COUNT + 1),
  };
}
