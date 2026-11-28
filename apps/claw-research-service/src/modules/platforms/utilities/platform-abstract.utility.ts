import { PLATFORM_OPENALEX_MAX_ABSTRACT_WORDS } from '../constants/platform-api.constants';

/**
 * OpenAlex ships abstracts as an inverted index (`{word: [positions]}`). Rebuilds
 * the text in position order, bounded to `PLATFORM_OPENALEX_MAX_ABSTRACT_WORDS`
 * words; anything that is not that shape yields null.
 */
export function abstractFromInvertedIndex(index: unknown): string | null {
  if (typeof index !== 'object' || index === null || Array.isArray(index)) {
    return null;
  }
  const placed: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) {
      continue;
    }
    for (const position of positions) {
      // Only the first N positions are ever shown, so only they are kept: bounded work.
      if (
        typeof position === 'number' &&
        Number.isInteger(position) &&
        position >= 0 &&
        position < PLATFORM_OPENALEX_MAX_ABSTRACT_WORDS &&
        placed.length < PLATFORM_OPENALEX_MAX_ABSTRACT_WORDS * 2
      ) {
        placed.push([position, word]);
      }
    }
  }
  return placed.length === 0
    ? null
    : placed
        .sort((left, right) => left[0] - right[0])
        .map(([, word]) => word)
        .join(' ');
}
