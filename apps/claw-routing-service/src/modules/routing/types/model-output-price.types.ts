import type { RoutingDecisionResult } from './routing.types';

/** Output prices (micro-USD per million tokens): each model's own, and the dearest per provider. */
export type PriceBook = {
  byModel: ReadonlyMap<string, number>;
  /** The dearest chat (token-priced) model each provider sells, upper-cased provider name. */
  dearestByProvider: ReadonlyMap<string, number>;
};

export type FreeModelPriceGuardResult = {
  decision: RoutingDecisionResult;
  /** How many candidates (the pick and its fallbacks) were left out for being above the limit. */
  excludedCandidates: number;
  /** True when the pick itself was replaced by a cheaper fallback. */
  promoted: boolean;
};
