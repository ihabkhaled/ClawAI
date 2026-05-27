// Whole-word keyword matcher used by every category-detection function in
// RoutingManager. Replaces the previous `.toLowerCase().includes(kw)`
// pattern, which had a quiet bug: short acronyms (NDA, PHI, PII, SSN, HR)
// matched as substrings inside unrelated words. Concretely "panda" contains
// "nda" — so a benign prompt like "generate an image of a panda" tripped
// both PRIVACY and LEGAL detection (both lists include "NDA"), which forced
// local routing and silently swallowed the user's image-generation intent.
//
// We escape regex metacharacters so phrases with `.`, `(`, etc. remain literal
// and bracket each keyword with \b to enforce word boundaries.
//
// English-plural tolerance: keywords are stored singular in the lists
// (`'interview question'`, `'learning objective'`, `'patent'`), but user
// prompts almost always use the plural form (`"prepare interview questions"`).
// Plain `\b<kw>\b` would miss those. We append an optional `s` or `es`
// before the trailing \b WHEN the keyword ends in a word character. This
// covers the common plurals without re-introducing the panda↔NDA substring
// bug — `\bNDAs?\b` still rejects "panda" because the leading \b requires
// a word boundary BEFORE N.

import { KEYWORD_REGEX_CACHE, KEYWORD_WORD_CHAR_RE } from '../constants';

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
    const lastChar = kw.at(-1) ?? '';
    // Only add plural tolerance when the keyword ends in a word char (avoids
    // turning `'just-in-time'` into something weird). Skip if the keyword
    // already ends in `s` — `\bnews?\b` would accept "new" which is wrong.
    const allowPlural = KEYWORD_WORD_CHAR_RE.test(lastChar) && lastChar.toLowerCase() !== 's';
    const tail = allowPlural ? '(?:s|es)?' : '';
    return new RegExp(`\\b${escaped}${tail}\\b`, 'i');
  });
  KEYWORD_REGEX_CACHE.set(keywords, compiled);
  return compiled;
}

export function matchKeyword(text: string, keywords: readonly string[]): boolean {
  const regexes = compileKeywords(keywords);
  return regexes.some((re) => re.test(text));
}
