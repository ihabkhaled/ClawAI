import {
  FOLLOW_UP_NEW_THOUGHT,
  SHORT_FOLLOW_UP_EXACT_MATCHES,
  SHORT_FOLLOW_UP_MAX_LENGTH,
} from '../constants/follow-up-detection.constants';

/**
 * Whether a short message repeats the previous generation ("another", "one
 * more", "again"). "another thing: …" opens a new thought and never matches.
 */
export function isFollowUpPhrase(lower: string, prefixes: readonly string[]): boolean {
  return lower.length >= SHORT_FOLLOW_UP_MAX_LENGTH || FOLLOW_UP_NEW_THOUGHT.test(lower) ? false : (
    SHORT_FOLLOW_UP_EXACT_MATCHES.includes(lower) ||
    prefixes.some((prefix) => lower.startsWith(prefix))
  );
}
