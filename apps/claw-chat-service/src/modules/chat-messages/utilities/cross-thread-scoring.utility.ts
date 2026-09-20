import { CROSS_THREAD_RECENCY_BANDS } from '../constants/cross-thread-retrieval.constants';

/**
 * Share of the search terms a message actually contains.
 *
 * Substring matching, deliberately, because it is exactly what the database
 * did to select the thread: a score computed on a different notion of "matches"
 * than the query would rank messages by a rule that never chose them.
 */
export function termMatchRatio(content: string, terms: readonly string[]): number {
  if (terms.length === 0) return 0;
  const haystack = content.toLowerCase();
  let hits = 0;
  for (const term of terms) if (haystack.includes(term.toLowerCase())) hits += 1;
  return hits / terms.length;
}

/**
 * How recent a thread is, as a weight between 0 and 1.
 *
 * Banded rather than continuous: the distinction that matters is "in this
 * sitting", "today" and "this week", and a smooth decay would invite tuning a
 * curve nobody can reason about.
 */
export function recencyWeight(updatedAt: Date | null | undefined): number {
  if (updatedAt === null || updatedAt === undefined) return 0;
  const age = Date.now() - updatedAt.getTime();
  if (age < 0) return 1;
  for (const [maximumAge, weight] of CROSS_THREAD_RECENCY_BANDS) {
    if (age <= maximumAge) return weight;
  }
  return 0;
}
