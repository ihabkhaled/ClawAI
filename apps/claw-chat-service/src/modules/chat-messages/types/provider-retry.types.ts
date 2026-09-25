/** How the chokepoint's single retry differs from the failed attempt (ADR-125). */
export type ProviderRetryPlan = {
  /** For the log line: why the retry happens. */
  reason: string;
  /** Lower the output cap to this for the retry. */
  ceiling?: number;
  /** Remember this as the model's output ceiling. */
  learnedMaxOutputTokens?: number;
  /** Wait this long before retrying (transient rate limit). */
  delayMs?: number;
};
