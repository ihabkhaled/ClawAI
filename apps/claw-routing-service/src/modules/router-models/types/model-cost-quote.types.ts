// The price of one request, in both units the platform cares about.
//
// `isPriced: false` means the registry could not price this model. That is NOT
// the same as "free": the caller must fail closed on a limited plan, because an
// unpriced model is unbounded provider spend.
export type ModelCostQuote = {
  weightedTokens: number;
  costMicroUsd: number;
  isPriced: boolean;
};
