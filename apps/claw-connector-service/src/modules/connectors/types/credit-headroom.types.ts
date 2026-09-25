/**
 * What a provider reports about how much its API key can still spend.
 *
 * `known: false` — nothing could be read (no endpoint, timeout, error). The
 * caller must NOT cap on it: the provider still enforces its own limit, and a
 * guessed cap would refuse answers the key could afford.
 *
 * `known: true, remainingMicroUsd: null` — the key has no limit.
 */
export type ProviderCreditHeadroom = {
  known: boolean;
  /** Integer micro-USD. Never a float (rule 37 §3). */
  remainingMicroUsd: number | null;
};
