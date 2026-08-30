import { MIN_MATCH_TOKEN_LENGTH } from '../constants/context-composer.constants';

/**
 * How many words in a prompt could carry meaning for retrieval.
 *
 * Used to decide whether a prompt is worth searching a user's whole history
 * for. "ok", "thanks" and "go on" match many old conversations weakly and none
 * of them strongly, so retrieval on such a prompt is noise by construction —
 * and noise imported from another conversation is worse than no context at all.
 *
 * Deliberately counts the same token shape the relevance scorers use, so the
 * gate and the scoring cannot disagree about what a meaningful word is.
 */
export function meaningfulTokenCount(intent: string): number {
  return new Set(
    intent
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= MIN_MATCH_TOKEN_LENGTH),
  ).size;
}
