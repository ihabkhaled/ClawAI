/** One remembered answer of `/api/show`: the window, or `undefined` when none could be read. */
export type OllamaContextWindowCacheEntry = {
  tokens: number | undefined;
  /** Epoch milliseconds after which the model is asked again. */
  expiresAt: number;
};

/** What one lookup did. A skipped lookup (out of budget) is not cached: it is tried next sync. */
export type OllamaContextWindowLookup = {
  modelName: string;
  isSkipped: boolean;
  tokens: number | undefined;
};
