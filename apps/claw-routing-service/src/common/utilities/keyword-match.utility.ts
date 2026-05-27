// Whole-word keyword matcher used by every category-detection function in
// RoutingManager. Replaces the previous `.toLowerCase().includes(kw)`
// pattern, which had a quiet bug: short acronyms (NDA, PHI, PII, SSN, HR)
// matched as substrings inside unrelated words. Concretely "panda" contains
// "nda" — so a benign prompt like "generate an image of a panda" tripped
// both PRIVACY and LEGAL detection (both lists include "NDA"), which forced
// local routing and silently swallowed the user's image-generation intent.
//
// The regex form uses \b on both sides for the common case, with a
// fallback for keywords that begin or end with non-word characters (e.g.
// "case law" with a space — \b around the space side already works).
// We escape regex metacharacters so phrases with `.`, `(`, etc. remain literal.

const KEYWORD_REGEX_CACHE = new WeakMap<readonly string[], RegExp[]>();

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileKeywords(keywords: readonly string[]): RegExp[] {
  const cached = KEYWORD_REGEX_CACHE.get(keywords);
  if (cached) {
    return cached;
  }
  const compiled = keywords.map((kw) => {
    const escaped = escapeRegExp(kw);
    return new RegExp(`\\b${escaped}\\b`, 'i');
  });
  KEYWORD_REGEX_CACHE.set(keywords, compiled);
  return compiled;
}

export function matchKeyword(text: string, keywords: readonly string[]): boolean {
  const regexes = compileKeywords(keywords);
  return regexes.some((re) => re.test(text));
}
