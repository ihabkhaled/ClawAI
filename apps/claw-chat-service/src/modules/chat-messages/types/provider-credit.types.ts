/** The per-token half of a model's rate card, integer micro-USD per million tokens. */
export type ProviderTokenRates = {
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
  reasoningPerMillionMicroUsd: number | null;
};
