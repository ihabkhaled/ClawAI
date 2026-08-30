/**
 * What a piece of context is worth when the token budget runs out.
 *
 * Eviction walks from P3 upwards. It never walks from "oldest", which is what
 * the previous `slice(-N)` did: the oldest message in a thread is very often
 * the one that named the project, chose the database or stated the constraint
 * the user is about to ask about, and it was the first thing thrown away.
 */
export enum ContextPriority {
  /** Never evictable: the current prompt, and anything it explicitly refers to. */
  P0_REQUIRED = 'P0_REQUIRED',
  /** The most recent complete turns. Evicted only after P2 and P3 are gone. */
  P1_RECENT = 'P1_RECENT',
  /** Older turns pulled back because they are relevant to this prompt. */
  P2_RETRIEVED = 'P2_RETRIEVED',
  /** Everything else, included only while budget remains. */
  P3_OPTIONAL = 'P3_OPTIONAL',
}
