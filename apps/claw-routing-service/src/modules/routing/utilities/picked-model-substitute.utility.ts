import { PAYG_EXEMPT_PROVIDERS } from '@claw/shared-constants';
import { modelMatchKey } from '@claw/shared-utilities';
import type { ModelCostClass } from '@claw/shared-types';

import {
  PICKED_MODEL_COST_CLASS_ORDER,
  PICKED_MODEL_GROUP_COSTLIER,
  PICKED_MODEL_GROUP_OTHER_PROVIDER,
  PICKED_MODEL_GROUP_SAME_PROVIDER,
  PICKED_MODEL_NON_CHAT_ID_PATTERN,
  PICKED_MODEL_SAME_PROVIDER_SHARE,
  PICKED_MODEL_UNKNOWN_COST_RANK,
} from '../constants/picked-model-substitute.constants';
import type {
  PickedModelSubstitute,
  PickedModelSubstituteRankingInput,
  ScoredPickedModelSubstitute,
} from '../types/picked-model-substitute.types';

/** Cheapest = 0. A class we do not know ranks after every known one. */
export function costClassRank(costClass: ModelCostClass | undefined): number {
  if (costClass === undefined) {
    return PICKED_MODEL_UNKNOWN_COST_RANK;
  }
  const rank = PICKED_MODEL_COST_CLASS_ORDER.indexOf(costClass);
  return rank < 0 ? PICKED_MODEL_UNKNOWN_COST_RANK : rank;
}

/**
 * The models that may answer when the user's PICKED model fails, best first.
 *
 * 1. Another model of the SAME provider at the pick's cost class or below,
 *    closest class first (the nearest thing to what the user chose).
 * 2. Other providers' models at the pick's cost class or below, closest first,
 *    keeping the eligible list's provider round-robin as the tie-break.
 * 3. Only then models of a HIGHER cost class, cheapest first, marked
 *    `costlier` so the bubble says so - never a silent upgrade.
 *
 * A substitute with no known cost class is not called costlier when the pick is
 * priced (it is refused at the reservation anyway) and sorts after every model
 * whose class is known. An UNPRICED pick (local/included) makes every substitute
 * costlier. The pick itself never appears.
 */
export function rankPickedModelSubstitutes(
  input: PickedModelSubstituteRankingInput,
): PickedModelSubstitute[] {
  const pickProvider = input.pick.provider.trim().toUpperCase();
  const pickRank = costClassRank(input.costClassOf(input.pick.provider, input.pick.model));
  const seen = new Set<string>([modelMatchKey(input.pick.provider, input.pick.model)]);
  const scored: ScoredPickedModelSubstitute[] = [];
  for (const [order, deployment] of input.eligible.entries()) {
    const provider = deployment.runtimeProviderKey ?? deployment.provider;
    const key = modelMatchKey(provider, deployment.providerModelId);
    if (seen.has(key) || PICKED_MODEL_NON_CHAT_ID_PATTERN.test(deployment.providerModelId)) {
      continue;
    }
    seen.add(key);
    const rank = costClassRank(input.costClassOf(provider, deployment.providerModelId));
    // An unpriced pick (every local/included model, any unseeded cloud model) is
    // the cheapest thing there is, so any cloud substitute may cost more and must
    // say so. With a priced pick an unpriced substitute is not called costlier.
    const costlier =
      pickRank === PICKED_MODEL_UNKNOWN_COST_RANK
        ? true
        : rank !== PICKED_MODEL_UNKNOWN_COST_RANK && rank > pickRank;
    const sameProvider = provider.trim().toUpperCase() === pickProvider;
    scored.push({
      substitute: {
        provider,
        model: deployment.providerModelId,
        sameProvider,
        costlier,
      },
      group: substituteGroup(sameProvider, costlier),
      // An unpriced pick has no class to be close to: cheapest known first.
      distance: pickRank === PICKED_MODEL_UNKNOWN_COST_RANK ? rank : Math.abs(rank - pickRank),
      order,
    });
  }
  scored.sort((a, b) => a.group - b.group || a.distance - b.distance || a.order - b.order);
  const chosen = diversify(scored, Math.max(0, input.limit));
  return withIncludedSafetyNet(chosen, scored, Math.max(0, input.limit)).map(
    (entry) => entry.substitute,
  );
}

function isIncludedProvider(provider: string): boolean {
  return PAYG_EXEMPT_PROVIDERS.some((exempt) => exempt.toUpperCase() === provider.toUpperCase());
}

/**
 * A user whose credit is used up (or whose free requests are) is refused by every
 * credit model, so the list must always end with a model that needs no credit.
 * When the ranking left none in, the best included one takes the last place, and
 * the pick's own order is otherwise untouched.
 */
function withIncludedSafetyNet(
  chosen: readonly ScoredPickedModelSubstitute[],
  all: readonly ScoredPickedModelSubstitute[],
  limit: number,
): ScoredPickedModelSubstitute[] {
  if (limit === 0 || chosen.some((entry) => isIncludedProvider(entry.substitute.provider))) {
    return [...chosen];
  }
  const included = all.find((entry) => isIncludedProvider(entry.substitute.provider));
  return included === undefined ? [...chosen] : [...chosen.slice(0, limit - 1), included];
}

/**
 * Takes `limit` entries from the sorted list such that other providers always
 * get room: at most PICKED_MODEL_SAME_PROVIDER_SHARE of the same provider
 * (a provider-wide outage makes the rest of them useless), then one model per
 * other provider, then whatever is left in sorted order. The result keeps the
 * sorted order.
 */
function diversify(
  sorted: readonly ScoredPickedModelSubstitute[],
  limit: number,
): ScoredPickedModelSubstitute[] {
  const chosen = new Set<ScoredPickedModelSubstitute>();
  const take = (entry: ScoredPickedModelSubstitute): void => {
    if (chosen.size < limit) {
      chosen.add(entry);
    }
  };
  let sameTaken = 0;
  for (const entry of sorted) {
    if (
      entry.substitute.sameProvider &&
      !entry.substitute.costlier &&
      sameTaken < PICKED_MODEL_SAME_PROVIDER_SHARE
    ) {
      take(entry);
      sameTaken++;
    }
  }
  const providersSeen = new Set<string>();
  for (const entry of sorted) {
    const provider = entry.substitute.provider.toUpperCase();
    if (
      !entry.substitute.sameProvider &&
      !entry.substitute.costlier &&
      !providersSeen.has(provider)
    ) {
      providersSeen.add(provider);
      take(entry);
    }
  }
  for (const entry of sorted) {
    take(entry);
  }
  return sorted.filter((entry) => chosen.has(entry));
}

function substituteGroup(sameProvider: boolean, costlier: boolean): number {
  if (costlier) {
    return PICKED_MODEL_GROUP_COSTLIER;
  }
  return sameProvider ? PICKED_MODEL_GROUP_SAME_PROVIDER : PICKED_MODEL_GROUP_OTHER_PROVIDER;
}
