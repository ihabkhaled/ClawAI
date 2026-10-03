/**
 * How the AUTO research keyword tables are matched.
 *
 * A marker is a WHOLE word or phrase, never a fragment of a longer word:
 * "news" must not fire on "newsletter", "recent" on "recently drafted", or
 * "as of" on "has of". Unicode lookarounds (not `\b`, which is ASCII-only)
 * include combining marks, so a Devanagari or Arabic word is not cut mid-word.
 */
export const AUTO_RESEARCH_MARKER_LEFT_BOUNDARY = String.raw`(?<![\p{L}\p{M}\p{N}])`;
export const AUTO_RESEARCH_MARKER_RIGHT_BOUNDARY = String.raw`(?![\p{L}\p{M}\p{N}])`;

/**
 * Scripts written without spaces between words: a marker in them can only be
 * matched as a substring ("请告诉我最新的消息" has no boundary around 最新).
 */
export const AUTO_RESEARCH_UNSPACED_SCRIPTS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
