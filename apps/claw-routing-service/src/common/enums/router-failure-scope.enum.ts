/**
 * How far a single failed router attempt invalidates the rest of the chain.
 *
 * This is the whole point of the canonical error codes: the pack's chain has
 * two Gemini entries followed by four Ollama Cloud ones, so a Google-wide
 * outage must skip entry 2 rather than burn a timeout on it, while a
 * model-specific fault must not condemn the provider.
 */
export enum RouterFailureScope {
  /**
   * This model failed; the provider is presumably fine. Advance to the next
   * chain entry, including one on the same provider.
   */
  MODEL = 'MODEL',

  /**
   * The provider itself is failing. Skip every later entry on that provider —
   * retrying a second Gemini model during a Google outage only spends the
   * deadline.
   */
  PROVIDER = 'PROVIDER',

  /**
   * The request is over. Cancellation, exhausted budget and policy blocks are
   * not the chain's problem to route around; continuing would be wrong rather
   * than merely wasteful.
   */
  REQUEST = 'REQUEST',
}
