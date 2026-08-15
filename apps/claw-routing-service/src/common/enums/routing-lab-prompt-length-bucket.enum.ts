/**
 * Coarse prompt-length dimension for the routing lab corpus.
 *
 * A router prompt's length changes token cost and, for some providers,
 * truncation risk — the corpus varies it deliberately rather than letting
 * every case land in the same bucket real traffic rarely stays in.
 */
export enum RoutingLabPromptLengthBucket {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}
