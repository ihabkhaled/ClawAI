import {
  EXPLICIT_WEB_PHRASE_PATTERNS,
  EXPLICIT_WEB_PLACE_PATTERN,
  EXPLICIT_WEB_VERB_PATTERN,
} from '../constants/explicit-web-request.constants';

/** True when the message plainly orders an internet lookup. Never replaces the classifier. */
export function isExplicitWebRequest(message: string): boolean {
  return (
    EXPLICIT_WEB_PHRASE_PATTERNS.some((pattern) => pattern.test(message)) ||
    (EXPLICIT_WEB_VERB_PATTERN.test(message) && EXPLICIT_WEB_PLACE_PATTERN.test(message))
  );
}
