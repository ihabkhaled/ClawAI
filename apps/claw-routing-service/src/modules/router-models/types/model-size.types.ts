/**
 * One model's size, for the pickers (ADR-234). Deliberately narrow: no price, no
 * quality tier, no capability flags. `GET /routing/model-sizes` is open to every
 * signed-in user (the chat picker calls it), so it carries only what a model
 * card already says in public, and never a rate (rules 37, 28).
 */
export type ModelSizeEntry = {
  provider: string;
  modelKey: string;
  /** Context window in tokens; null when neither the catalog nor the published family window knows it. */
  contextWindowTokens: number | null;
  /** Total parameters in billions (0.5 = 500M, 1000 = 1T); null when the maker publishes none. */
  parameterCountBillions: number | null;
  /** Per-token share of a mixture-of-experts model, in billions; null for a dense or unknown model. */
  activeParameterCountBillions: number | null;
};

/** The registry columns the size list reads (a narrow projection, not the 60-field record). */
export type RouterModelSizeRow = {
  provider: string;
  modelKey: string;
  contextWindowTokens: number | null;
  maxContextTokens: number | null;
  parameterCountBillions: { toNumber: () => number } | null;
  activeParameterCountBillions: { toNumber: () => number } | null;
};

export type ModelSizeCatalog = { data: ModelSizeEntry[] };
