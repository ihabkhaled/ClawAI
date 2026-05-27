export type ExecutionOptions = {
  fastPathEnabled: boolean;
  // Optional now: when undefined the adapter does NOT send max_tokens /
  // num_predict to the provider, letting the model decide its own stop
  // token. The cap is only applied when the thread explicitly sets one
  // (or the AUTO fast-path deliberately wants short replies).
  maxOutputTokens?: number;
  applyShortResponseConstraint: boolean;
};
