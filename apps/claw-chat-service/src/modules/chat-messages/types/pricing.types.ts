// Approximate public list price for a model, in USD per 1,000,000 tokens.
// Used only for ESTIMATED cost display; exact billing is the provider's.
export type ModelPriceEntry = {
  inputPerMillion: number;
  outputPerMillion: number;
};

export type CostEstimate = {
  costUsd?: number;
  available: boolean;
};
